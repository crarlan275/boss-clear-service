import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const SA_PATH = 'C:/Users/USUARIO/Downloads/boss-clear-service-firebase-adminsdk-fbsvc-47aad81198.json'
initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) })
const db = getFirestore()

async function fix() {
  // Eliminar Limbo Extreme
  await db.collection('bosses').doc('limbo_extreme').delete()
  console.log('✓ Eliminado: limbo_extreme')

  // Agregar Watcher Kalos Extreme
  await db.collection('bosses').doc('watcher_kalos_extreme').set({
    name: 'Watcher Kalos',
    difficulty: 'Extreme',
    isActive: true,
    price: 0,
    createdAt: new Date().toISOString(),
  })
  console.log('✓ Agregado: watcher_kalos_extreme')

  process.exit(0)
}

fix().catch(e => { console.error(e); process.exit(1) })
