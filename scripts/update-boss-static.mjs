import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: cert(JSON.parse(readFileSync('C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json', 'utf8'))) })
const db = getFirestore()

// URL relativa (Vercel sirve /public como raíz)
const BASE = '/boss-images'

const BOSS_IMAGES = {
  'Adversary':    `${BASE}/adversary.png`,
  'Baldrix':      `${BASE}/baldrix.gif`,
  'Black Mage':   `${BASE}/black-mage.png`,
  'Chosen Seren': `${BASE}/seren.png`,
  'Watcher Kalos':`${BASE}/kalos.webp`,
  'Kaling':       `${BASE}/kaling.png`,
  'Limbo':        `${BASE}/limbo.jpg`,
}

const snap = await db.collection('bosses').get()
let updated = 0

for (const docSnap of snap.docs) {
  const { name } = docSnap.data()
  const imageUrl = BOSS_IMAGES[name]
  if (imageUrl) {
    await docSnap.ref.update({ imageUrl })
    console.log(`✓ ${docSnap.id}`)
    updated++
  }
}

console.log(`\n✓ ${updated} documentos actualizados.`)
process.exit(0)
