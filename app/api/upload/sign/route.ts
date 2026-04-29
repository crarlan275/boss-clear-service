import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { createHash } from 'crypto'

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME!
const KEY    = process.env.CLOUDINARY_API_KEY!
const SECRET = process.env.CLOUDINARY_API_SECRET!
const FOLDER = 'boss-clear-service/clears'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer '))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await getAdminAuth().verifyIdToken(authHeader.slice(7))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const toSign    = `folder=${FOLDER}&timestamp=${timestamp}${SECRET}`
  const signature = createHash('sha1').update(toSign).digest('hex')

  return NextResponse.json({ signature, timestamp, apiKey: KEY, cloudName: CLOUD, folder: FOLDER })
}
