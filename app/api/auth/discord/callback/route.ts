import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'

const DISCORD_API = 'https://discord.com/api/v10'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=discord_denied', req.url))
  }

  try {
    const clientId = process.env.DISCORD_CLIENT_ID!.trim()
    const clientSecret = process.env.DISCORD_CLIENT_SECRET!.trim()
    const redirectUri = process.env.DISCORD_REDIRECT_URI!.trim()

    // 1. Exchange code for Discord access token
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })
    if (!tokenRes.ok) {
      console.error('Discord token exchange failed:', await tokenRes.text())
      throw new Error('token_exchange_failed')
    }
    const { access_token } = await tokenRes.json() as { access_token: string }

    // 2. Get Discord user info
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!userRes.ok) throw new Error('user_fetch_failed')
    const discordUser = await userRes.json() as {
      id: string
      username: string
      global_name?: string
      email?: string
      avatar?: string | null
    }

    const uid = `discord_${discordUser.id}`
    const displayName = discordUser.global_name || discordUser.username
    const email = discordUser.email ?? null
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(discordUser.id) % 6}.png`

    // 3. Ensure Firebase user exists
    const adminAuth = getAdminAuth()
    try {
      await adminAuth.getUser(uid)
    } catch {
      await adminAuth.createUser({
        uid,
        displayName,
        ...(email ? { email } : {}),
      })
    }

    // 4. Mint Firebase custom token
    const customToken = await adminAuth.createCustomToken(uid)

    // 5. Set short-lived cookie and redirect to completion page
    const completionUrl = new URL('/auth/discord/complete', req.url)
    completionUrl.searchParams.set('name', displayName)
    if (email) completionUrl.searchParams.set('email', email)
    completionUrl.searchParams.set('avatar', avatarUrl)

    const response = NextResponse.redirect(completionUrl)
    response.cookies.set('_discord_ft', customToken, {
      httpOnly: false,       // must be readable by client JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 120,           // 2 minutes — enough to complete sign-in
      path: '/',             // broad path so document.cookie can always read it
    })
    return response
  } catch (err) {
    console.error('Discord OAuth error:', err)
    return NextResponse.redirect(new URL('/login?error=discord_failed', req.url))
  }
}
