import { readFileSync, createReadStream } from 'fs'
import { extname } from 'path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const sa = JSON.parse(readFileSync('C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json', 'utf8'))
initializeApp({
  credential: cert(sa),
  storageBucket: 'boss-clear-service.firebasestorage.app',
})
const db = getFirestore()
const bucket = getStorage().bucket()

// Archivo local → nombre del boss en Firestore
const FILES = [
  { file: 'C:/Users/USUARIO/Downloads/Adversary.gif',   boss: 'Adversary' },
  { file: 'C:/Users/USUARIO/Downloads/Baldrix.gif',     boss: 'Baldrix' },
  { file: 'C:/Users/USUARIO/Downloads/black mage.png',  boss: 'Black Mage' },
  { file: 'C:/Users/USUARIO/Downloads/seren.png',       boss: 'Chosen Seren' },
  { file: 'C:/Users/USUARIO/Downloads/kalos.webp',      boss: 'Watcher Kalos' },
  { file: 'C:/Users/USUARIO/Downloads/kaling.png',      boss: 'Kaling' },
  { file: 'C:/Users/USUARIO/Downloads/Limbo.jpg',       boss: 'Limbo' },
]

const MIME = { '.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' }

for (const { file, boss } of FILES) {
  const ext = extname(file).toLowerCase()
  const dest = `boss-images/${boss.toLowerCase().replace(/\s+/g, '-')}${ext}`

  console.log(`Uploading ${boss}...`)
  await bucket.upload(file, {
    destination: dest,
    metadata: { contentType: MIME[ext] },
  })

  // Make public
  const fileRef = bucket.file(dest)
  await fileRef.makePublic()
  const imageUrl = `https://storage.googleapis.com/boss-clear-service.firebasestorage.app/${dest}`

  // Update all Firestore docs for this boss
  const snap = await db.collection('bosses').where('name', '==', boss).get()
  for (const docSnap of snap.docs) {
    await docSnap.ref.update({ imageUrl })
  }
  console.log(`✓ ${boss} → ${imageUrl} (${snap.size} docs)`)
}

console.log('\nDone.')
process.exit(0)
