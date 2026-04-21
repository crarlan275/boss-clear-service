import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: cert(JSON.parse(readFileSync('C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json', 'utf8'))) })
const db = getFirestore()

const BOSS_ARTWORK = {
  'Guardian Angel Slime': 'https://media.maplestorywiki.net/yetidb/Mob_Guardian_Angel_Slime.png',
  'Darknell':             'https://media.maplestorywiki.net/yetidb/Soul_Collector_Artwork_Guard_Captain_Darknell_(1).png',
  'Verus Hilla':          'https://media.maplestorywiki.net/yetidb/Soul_Collector_Artwork_Verus_Hilla_(1).png',
  'Black Mage':           'https://media.maplestorywiki.net/yetidb/Mob_Black_Mage.png',
  'Chosen Seren':         'https://media.maplestorywiki.net/yetidb/Mob_Chosen_Seren_(Dawn).png',
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
