import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: cert(JSON.parse(readFileSync('C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json', 'utf8'))) })
const db = getFirestore()

const BOSS_IMAGES = {
  'Lotus':                'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Lotus.png',
  'Damien':               'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Damien.png',
  'Lucid':                'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Lucid.png',
  'Will':                 'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Will.png',
  'Guardian Angel Slime': 'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Guardian_Angel_Slime.png',
  'Gloom':                'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Giant_Monster_Gloom.png',
  'Darknell':             'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Guard_Captain_Darknell.png',
  'Verus Hilla':          'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Verus_Hilla.png',
  'Black Mage':           'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Black_Mage.png',
  'Chosen Seren':         'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Chosen_Seren.png',
  'Watcher Kalos':        'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Kalos_the_Guardian.png',
  'Kaling':               'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Kaling.png',
  'Limbo':                'https://media.maplestorywiki.net/yetidb/Boss_Entry_UI_-_Limbo.png',
}

const snap = await db.collection('bosses').get()
let updated = 0
for (const docSnap of snap.docs) {
  const { name } = docSnap.data()
  const imageUrl = BOSS_IMAGES[name]
  if (imageUrl) {
    await docSnap.ref.update({ imageUrl })
    console.log(`✓ ${name}`)
    updated++
  }
}
console.log(`\n✓ ${updated} bosses actualizados.`)
process.exit(0)
