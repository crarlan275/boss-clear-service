/**
 * Deploys Firestore security rules using the Firebase Rules REST API.
 * Uses the service account JSON for authentication.
 */

import { readFileSync } from 'fs'
import { createSign } from 'crypto'

const SA_PATH = 'C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json'
const PROJECT = 'boss-clear-service'

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'))

const rules = readFileSync('./firestore.rules', 'utf8')

// ── Generate JWT for service account ──────────────────────────────────────────
function createJWT() {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(sa.private_key, 'base64url')
  return `${header}.${payload}.${sig}`
}

// ── Exchange JWT for access token ─────────────────────────────────────────────
async function getAccessToken() {
  const jwt = createJWT()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('Token error: ' + JSON.stringify(data))
  return data.access_token
}

// ── Deploy rules ──────────────────────────────────────────────────────────────
async function deployRules() {
  const token = await getAccessToken()
  console.log('✓ Token obtained')

  // 1. Create a new ruleset
  const rulesetRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          files: [{ name: 'firestore.rules', content: rules }],
        },
      }),
    }
  )
  const ruleset = await rulesetRes.json()
  if (!rulesetRes.ok) throw new Error('Ruleset error: ' + JSON.stringify(ruleset))
  console.log('✓ Ruleset created:', ruleset.name)

  // 2. Update the Cloud Firestore release to point to the new ruleset
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/cloud.firestore`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT}/releases/cloud.firestore`,
          rulesetName: ruleset.name,
        }
      }),
    }
  )
  const releaseText = await releaseRes.text()
  let release
  try { release = JSON.parse(releaseText) } catch { throw new Error('Release response: ' + releaseText.slice(0, 300)) }
  if (!releaseRes.ok) throw new Error('Release error: ' + JSON.stringify(release))
  console.log('✓ Rules deployed successfully!')
  console.log('  Release:', release.name)
}

deployRules().catch((err) => {
  console.error('✗', err.message)
  process.exit(1)
})
