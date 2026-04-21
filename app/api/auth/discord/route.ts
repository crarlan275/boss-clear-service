import { NextResponse } from 'next/server'

export function GET() {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!.trim(),
    redirect_uri: process.env.DISCORD_REDIRECT_URI!.trim(),
    response_type: 'code',
    scope: 'identify email applications.commands',
    integration_type: '1',
  })
  return NextResponse.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`
  )
}
