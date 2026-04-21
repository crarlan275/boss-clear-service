import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: cert(JSON.parse(readFileSync('C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json', 'utf8'))) })
const db = getFirestore()

const NEW_BOSSES = [
  // Adversary: Easy, Normal, Hard, Extreme
  { name: 'Adversary', difficulty: 'Easy',    imageUrl: 'https://media.maplestorywiki.net/yetidb/Adversary.png' },
  { name: 'Adversary', difficulty: 'Normal',  imageUrl: 'https://media.maplestorywiki.net/yetidb/Adversary.png' },
  { name: 'Adversary', difficulty: 'Hard',    imageUrl: 'https://media.maplestorywiki.net/yetidb/Adversary.png' },
  { name: 'Adversary', difficulty: 'Extreme', imageUrl: 'https://media.maplestorywiki.net/yetidb/Adversary.png' },

  // Baldrix: Normal, Hard
  { name: 'Baldrix', difficulty: 'Normal', imageUrl: 'https://media.maplestorywiki.net/yetidb/Mobicon_Baldrix.png' },
  { name: 'Baldrix', difficulty: 'Hard',   imageUrl: 'https://media.maplestorywiki.net/yetidb/Mobicon_Baldrix.png' },
]

function toDocId(name, difficulty) {
  return `${name.toLowerCase().replace(/\s+/g, '_')}_${difficulty.toLowerCase()}`
}

const col = db.collection('bosses')
for (const boss of NEW_BOSSES) {
  const id = toDocId(boss.name, boss.difficulty)
  const ref = col.doc(id)
  const snap = await ref.get()
  if (snap.exists) {
    console.log(`skip  ${id}`)
    continue
  }
  await ref.set({
    name: boss.name,
    difficulty: boss.difficulty,
    isActive: true,
    price: 0,
    imageUrl: boss.imageUrl,
    createdAt: new Date().toISOString(),
  })
  console.log(`✓ added ${id}`)
}

console.log('\nDone.')
process.exit(0)
