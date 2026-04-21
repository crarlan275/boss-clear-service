import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: cert(JSON.parse(readFileSync('C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json', 'utf8'))) })
const db = getFirestore()

// imageUrl por nombre de boss (aplica a todas sus dificultades)
const BOSS_ARTWORK = {
  'Adversary': 'https://media.maplestorywiki.net/yetidb/Adversary.png',
  'Will':      'https://media.maplestorywiki.net/yetidb/Soul_Collector_Artwork_Will_(1).png',
  'Lotus':     'https://media.maplestorywiki.net/yetidb/Soul_Collector_Artwork_Lotus_(1).png',
  'Damien':    'https://media.maplestorywiki.net/yetidb/Soul_Collector_Artwork_Damien_(1).png',
  'Lucid':     'https://media.maplestorywiki.net/yetidb/Soul_Collector_Artwork_Lucid_(1).png',
}

const snap = await db.collection('bosses').get()
let updated = 0

for (const docSnap of snap.docs) {
  const { name } = docSnap.data()
  const imageUrl = BOSS_ARTWORK[name]
  if (imageUrl) {
    await docSnap.ref.update({ imageUrl })
    console.log(`✓ ${docSnap.id}`)
    updated++
  }
}

console.log(`\n✓ ${updated} documentos actualizados.`)
process.exit(0)
