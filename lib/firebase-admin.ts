import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set')

  const serviceAccount = JSON.parse(raw) as ServiceAccount

  // Vercel sometimes stores private keys with escaped newlines
  if (typeof (serviceAccount as Record<string, unknown>).private_key === 'string') {
    (serviceAccount as Record<string, unknown>).private_key = (
      (serviceAccount as Record<string, unknown>).private_key as string
    ).replace(/\\n/g, '\n')
  }

  return initializeApp({ credential: cert(serviceAccount) })
}

// Lazy getter — only initializes when actually called at request time, not at build time
export function getAdminAuth() {
  return getAuth(getAdminApp())
}
