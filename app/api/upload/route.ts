import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { createHash } from 'crypto'

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME!
const KEY   = process.env.CLOUDINARY_API_KEY!
const SECRET = process.env.CLOUDINARY_API_SECRET!
const FOLDER = 'boss-clear-service/clears'

async function verifyToken(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return false
  try {
    const adminAuth = await getAdminAuth()
    await adminAuth.verifyIdToken(token)
    return true
  } catch {
    return false
  }
}

// ── POST: subir imagen ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await verifyToken(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!CLOUD || !KEY || !SECRET)
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()

    const timestamp = Math.floor(Date.now() / 1000)
    const toSign = `folder=${FOLDER}&timestamp=${timestamp}${SECRET}`
    const signature = createHash('sha1').update(toSign).digest('hex')

    // Enviar como FormData binario (no base64) — evita problemas de tamaño con URLSearchParams
    const cloudForm = new FormData()
    cloudForm.append('file', new Blob([bytes], { type: file.type }), file.name || 'upload')
    cloudForm.append('api_key', KEY)
    cloudForm.append('timestamp', String(timestamp))
    cloudForm.append('signature', signature)
    cloudForm.append('folder', FOLDER)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: 'POST',
      body: cloudForm,
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      const msg = typeof data.error === 'string' ? data.error : data.error?.message ?? 'Upload failed'
      console.error('Cloudinary upload error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ url: data.secure_url, publicId: data.public_id })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── DELETE: eliminar imagen (limpieza de 14 días) ───────────────────────────
export async function DELETE(req: NextRequest) {
  if (!await verifyToken(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!CLOUD || !KEY || !SECRET)
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 })

  try {
    const { publicId } = await req.json()
    if (!publicId) return NextResponse.json({ error: 'No publicId' }, { status: 400 })

    const timestamp = Math.floor(Date.now() / 1000)
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${SECRET}`
    const signature = createHash('sha1').update(toSign).digest('hex')

    const body = new URLSearchParams({
      public_id: publicId,
      api_key: KEY,
      timestamp: String(timestamp),
      signature,
    })

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/destroy`, {
      method: 'POST',
      body,
    })

    const data = await res.json()
    return NextResponse.json({ result: data.result })
  } catch (err) {
    console.error('Delete error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
