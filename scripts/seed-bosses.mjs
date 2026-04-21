/**
 * Seed script: agrega todos los bosses de MapleStory GMS (Lotus en adelante)
 * Usa Firebase Admin SDK con service account.
 * El document ID es: bossName_difficulty (ej: lotus_hard)
 */

import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const SA_PATH = 'C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json'
const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'))

initializeApp({ credential: cert(sa) })
const db = getFirestore()

// ── Boss catalog ──────────────────────────────────────────────────────────────
// Orden: Easy → Normal → Hard → Chaos → Extreme
const BOSSES = [
  // Lotus
  { name: 'Lotus', difficulty: 'Normal' },
  { name: 'Lotus', difficulty: 'Hard' },

  // Damien
  { name: 'Damien', difficulty: 'Normal' },
  { name: 'Damien', difficulty: 'Hard' },

  // Lucid
  { name: 'Lucid', difficulty: 'Normal' },
  { name: 'Lucid', difficulty: 'Hard' },

  // Will
  { name: 'Will', difficulty: 'Normal' },
  { name: 'Will', difficulty: 'Hard' },

  // Guardian Angel Slime
  { name: 'Guardian Angel Slime', difficulty: 'Normal' },
  { name: 'Guardian Angel Slime', difficulty: 'Chaos' },

  // Gloom
  { name: 'Gloom', difficulty: 'Normal' },
  { name: 'Gloom', difficulty: 'Chaos' },

  // Darknell
  { name: 'Darknell', difficulty: 'Normal' },
  { name: 'Darknell', difficulty: 'Hard' },

  // Verus Hilla (solo Hard en GMS)
  { name: 'Verus Hilla', difficulty: 'Hard' },

  // Black Mage
  { name: 'Black Mage', difficulty: 'Normal' },
  { name: 'Black Mage', difficulty: 'Hard' },

  // Chosen Seren
  { name: 'Chosen Seren', difficulty: 'Normal' },
  { name: 'Chosen Seren', difficulty: 'Hard' },

  // Watcher Kalos
  { name: 'Watcher Kalos', difficulty: 'Easy' },
  { name: 'Watcher Kalos', difficulty: 'Normal' },
  { name: 'Watcher Kalos', difficulty: 'Chaos' },

  // Kaling
  { name: 'Kaling', difficulty: 'Easy' },
  { name: 'Kaling', difficulty: 'Normal' },
  { name: 'Kaling', difficulty: 'Hard' },
  { name: 'Kaling', difficulty: 'Extreme' },

  // Limbo
  { name: 'Limbo', difficulty: 'Easy' },
  { name: 'Limbo', difficulty: 'Normal' },
  { name: 'Limbo', difficulty: 'Hard' },
  { name: 'Limbo', difficulty: 'Extreme' },
]

function toDocId(name, difficulty) {
  return `${name.toLowerCase().replace(/\s+/g, '_')}_${difficulty.toLowerCase()}`
}

async function seed() {
  const col = db.collection('bosses')
  let added = 0, skipped = 0

  for (const boss of BOSSES) {
    const id = toDocId(boss.name, boss.difficulty)
    const ref = col.doc(id)
    const snap = await ref.get()

    if (snap.exists) {
      console.log(`  skip  ${id}`)
      skipped++
      continue
    }

    await ref.set({
      name: boss.name,
      difficulty: boss.difficulty,
      isActive: true,
      price: 0,
      createdAt: new Date().toISOString(),
    })
    console.log(`  added ${id}`)
    added++
  }

  console.log(`\n✓ Done: ${added} added, ${skipped} already existed.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('✗', err)
  process.exit(1)
})
