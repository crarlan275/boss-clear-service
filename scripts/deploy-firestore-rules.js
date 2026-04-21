// Deploys firestore.rules to Firebase via REST API
// Usage: node scripts/deploy-firestore-rules.js

const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
const PROJECT_ID = serviceAccount.project_id

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
function signJwt(payload, privateKey) {
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const body = base64url(Buffer.from(JSON.stringify(payload)))
  const signing = `${header}.${body}`
  const sig = crypto.createSign('RSA-SHA256').update(signing).sign(privateKey)
  return `${signing}.${base64url(sig)}`
}
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  const jwt = signJwt({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }, serviceAccount.private_key)
  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { const j = JSON.parse(data); j.access_token ? resolve(j.access_token) : reject(new Error(JSON.stringify(j))) })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}
function apiRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : ''
    const req = https.request({
      hostname: 'firebaserules.googleapis.com', path, method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}) },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }))
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

async function main() {
  const rulesSource = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8')
  const token = await getAccessToken()

  // Create ruleset
  const rulesetRes = await apiRequest('POST', `/v1/projects/${PROJECT_ID}/rulesets`, token, {
    source: { files: [{ name: 'firestore.rules', content: rulesSource }] },
  })
  if (rulesetRes.status !== 200) { console.error('Ruleset error:', rulesetRes.body); process.exit(1) }
  const rulesetName = rulesetRes.body.name
  console.log('Ruleset created:', rulesetName)

  // Update release
  const releaseName = `projects/${PROJECT_ID}/releases/cloud.firestore`
  const releaseRes = await apiRequest('PATCH', `/v1/${releaseName}?updateMask=rulesetName`, token, {
    release: { name: releaseName, rulesetName },
  })
  if (releaseRes.status !== 200) { console.error('Release error:', releaseRes.body); process.exit(1) }
  console.log(`✓ Todo listo: ${releaseName}`)
}

main().catch(e => { console.error(e); process.exit(1) })
