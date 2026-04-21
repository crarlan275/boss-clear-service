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
      res.on('end', () => { const j = JSON.parse(data); j.access_token ? resolve(j.access_token) : reject(j) })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}

async function main() {
  const token = await getAccessToken()
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'firebaserules.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/releases`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { console.log(JSON.stringify(JSON.parse(data), null, 2)); resolve() })
    })
    req.on('error', reject); req.end()
  })
}
main().catch(console.error)
