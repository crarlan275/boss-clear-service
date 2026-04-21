import { NextRequest, NextResponse } from 'next/server'
import { getFirestore } from 'firebase-admin/firestore'
import { getAdminAuth } from '@/lib/firebase-admin'

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const DISCORD_API = 'https://discord.com/api/v10'

async function sendDiscordDM(discordId: string, content: string, embeds?: object[]) {
  // 1. Abrir/obtener canal de DM
  const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: discordId }),
  })

  if (!dmRes.ok) {
    const err = await dmRes.text()
    throw new Error(`No se pudo abrir canal DM: ${err}`)
  }

  const { id: channelId } = await dmRes.json()

  // 2. Enviar mensaje
  const msgRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, embeds }),
  })

  if (!msgRes.ok) {
    const err = await msgRes.text()
    throw new Error(`Error enviando mensaje: ${err}`)
  }

  return msgRes.json()
}

export async function POST(req: NextRequest) {
  try {
    // Verificar auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const idToken = authHeader.slice(7)
    await getAdminAuth().verifyIdToken(idToken)

    const { clientId, bossName, difficulty, characterName, clearedAt, notes, imageUrl } = await req.json()
    if (!clientId || !bossName) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // Obtener perfil del cliente
    const db = getFirestore()
    const profileSnap = await db.collection('profiles').doc(clientId).get()
    if (!profileSnap.exists) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const profile = profileSnap.data()!
    if (!profile.notificationsEnabled || !profile.discordId) {
      return NextResponse.json({ skipped: true })
    }

    // Colores por dificultad
    const diffColors: Record<string, number> = {
      Easy: 0x57f287,
      Normal: 0x3498db,
      Hard: 0xe67e22,
      Chaos: 0xe74c3c,
      Extreme: 0x9b59b6,
    }

    const dateStr = new Date(clearedAt + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const embed = {
      title: '⚔️ Boss Cleared',
      color: diffColors[difficulty] ?? 0xfbbf24,
      description: `Your pilot just registered a boss clear. Keep it up! 🎉`,
      fields: [
        { name: '🐉 Boss', value: `**${bossName}**`, inline: true },
        { name: '⚡ Difficulty', value: difficulty || '—', inline: true },
        { name: '🧙 Character', value: characterName || '—', inline: true },
        { name: '📅 Date', value: dateStr, inline: false },
        ...(notes ? [{ name: '📝 Pilot note', value: notes, inline: false }] : []),
      ],
      footer: { text: 'Boss Clear Service — BCS' },
      timestamp: new Date().toISOString(),
      ...(imageUrl ? { image: { url: imageUrl } } : {}),
    }

    await sendDiscordDM(
      profile.discordId,
      `Hello **${profile.displayName}**!`,
      [embed]
    )

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[notify]', msg)
    // No bloqueamos el clear si la notif falla
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
