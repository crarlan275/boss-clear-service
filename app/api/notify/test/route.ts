import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const DISCORD_API = 'https://discord.com/api/v10'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    await getAdminAuth().verifyIdToken(authHeader.slice(7))

    const { discordId, displayName } = await req.json()
    if (!discordId) return NextResponse.json({ error: 'Falta discordId' }, { status: 400 })

    // Abrir canal DM
    const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: 'POST',
      headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: discordId }),
    })
    if (!dmRes.ok) {
      const err = await dmRes.text()
      return NextResponse.json({ error: `No se pudo contactar tu cuenta de Discord: ${err}` }, { status: 400 })
    }
    const { id: channelId } = await dmRes.json()

    // Enviar mensaje de prueba
    const embed = {
      title: '🔔 Notificaciones activas',
      color: 0xfbbf24,
      description: `¡Hola **${displayName}**! Las notificaciones de **Boss Clear Service** están configuradas correctamente.\n\nRecibirás un mensaje como este cada vez que tu piloto complete un boss. ⚔️`,
      footer: { text: 'Boss Clear Service — BCS' },
      timestamp: new Date().toISOString(),
    }

    const msgRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    if (!msgRes.ok) {
      const err = await msgRes.text()
      return NextResponse.json({ error: `Error enviando mensaje: ${err}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
