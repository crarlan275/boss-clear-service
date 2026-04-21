// Crea un weekly_post con todos los bosses activos para la semana actual
const path = require('path')
const https = require('https')
const crypto = require('crypto')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
const PROJECT = sa.project_id

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
}
function signJwt(payload, key) {
  const h = base64url(Buffer.from(JSON.stringify({ alg:'RS256', typ:'JWT' })))
  const b = base64url(Buffer.from(JSON.stringify(payload)))
  const sig = crypto.createSign('RSA-SHA256').update(`${h}.${b}`).sign(key)
  return `${h}.${b}.${base64url(sig)}`
}
async function getToken() {
  const now = Math.floor(Date.now()/1000)
  const jwt = signJwt({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now+3600 }, sa.private_key)
  return new Promise((res, rej) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    const req = https.request({ hostname:'oauth2.googleapis.com', path:'/token', method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':body.length} }, r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ const j=JSON.parse(d); j.access_token?res(j.access_token):rej(j) })
    }); req.on('error',rej); req.write(body); req.end()
  })
}
function firestoreReq(method, path, token, body) {
  return new Promise((res, rej) => {
    const bodyStr = body ? JSON.stringify(body) : ''
    const req = https.request({ hostname:'firestore.googleapis.com', path, method, headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json', ...(bodyStr?{'Content-Length':Buffer.byteLength(bodyStr)}:{}) } }, r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({ status:r.statusCode, body:JSON.parse(d) }))
    }); req.on('error',rej); if(bodyStr) req.write(bodyStr); req.end()
  })
}

// Lunes de la semana actual
function getMonday() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0,0,0,0)
  return monday.toISOString().split('T')[0]
}

async function main() {
  const token = await getToken()
  const base = `/v1/projects/${PROJECT}/databases/(default)/documents`

  // Obtener todos los bosses activos
  const bossesRes = await firestoreReq('GET', `${base}/bosses?pageSize=100`, token)
  if (bossesRes.status !== 200) { console.error('Error fetching bosses:', bossesRes.body); process.exit(1) }

  const activeBossIds = (bossesRes.body.documents || [])
    .filter(d => d.fields?.isActive?.booleanValue === true)
    .map(d => d.name.split('/').pop())

  console.log(`Bosses activos encontrados: ${activeBossIds.length}`)

  const weekStart = getMonday()
  console.log(`Semana: ${weekStart}`)

  // Crear weekly_post
  const postData = {
    fields: {
      weekStart:   { stringValue: weekStart },
      notes:       { nullValue: null },
      createdBy:   { stringValue: 'system' },
      createdAt:   { stringValue: new Date().toISOString() },
      bossIds:     { arrayValue: { values: activeBossIds.map(id => ({ stringValue: id })) } },
    }
  }

  const createRes = await firestoreReq('POST', `${base}/weekly_posts`, token, postData)
  if (createRes.status !== 200) { console.error('Error creating post:', createRes.body); process.exit(1) }

  console.log(`✓ Weekly post creado para semana ${weekStart} con ${activeBossIds.length} bosses`)
}

main().catch(e => { console.error(e); process.exit(1) })
