'use client'

import { useState, useEffect } from 'react'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const { lang, t } = useLang()
  const s = t.settings
  const [discordId, setDiscordId] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!user) return
    async function load() {
      const snap = await getDoc(doc(db, 'profiles', user!.uid))
      if (snap.exists()) {
        const data = snap.data()
        setDiscordId(data.discordId ?? '')
        setNotificationsEnabled(data.notificationsEnabled ?? false)
      }
    }
    load()
  }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'profiles', user.uid), { discordId: discordId.trim(), notificationsEnabled })
      toast.success(s.saved)
    } catch {
      toast.error(s.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!user || !discordId.trim()) { toast.error(s.noId); return }
    setTesting(true)
    try {
      const { auth } = await import('@/lib/firebase')
      const idToken = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/notify/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: discordId.trim(), displayName: profile?.displayName ?? 'User' }),
      })
      const data = await res.json()
      if (res.ok) toast.success(s.testOk)
      else toast.error(`Error: ${data.error ?? s.testError}`)
    } catch {
      toast.error(s.testError)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-amber-400/15 bg-card/60 p-6 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 120% at 100% 50%, rgba(180,140,30,0.09) 0%, transparent 70%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-400/70 mb-1">{s.account}</p>
          <h1 className="font-cinzel text-3xl font-bold text-foreground">{s.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{s.subtitle}</p>
        </div>
      </div>

      {/* Discord Notifications */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <CardTitle className="flex items-center gap-3 font-cinzel text-base tracking-widest uppercase">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[#5865F2]">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            {s.discordTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">

          {/* How it works */}
          <div className="rounded-lg border border-[#5865F2]/20 bg-[#5865F2]/[0.06] px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-[#7289da]">{s.howTitle}</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>{s.how1}</li>
              <li>{s.how2}</li>
              <li>{s.how3}</li>
            </ol>
          </div>

          {/* Step 1 — Open bot chat */}
          <a
            href="https://discord.com/users/1494464099113894129"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3 transition-colors hover:bg-[#5865F2]/20 w-fit"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[#5865F2] flex-shrink-0">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#7289da]">{s.step1Label}</p>
              <p className="text-xs text-muted-foreground">{s.step1Sub}</p>
            </div>
            <span className="ml-auto text-[#5865F2] text-xs">↗</span>
          </a>

          {/* Step 2 — Get Discord ID */}
          <div className="rounded-lg border border-border/40 bg-background/30 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.step2Title}</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>{s.step2a} <span className="text-foreground font-semibold">{s.step2aDev}</span></li>
              <li>{s.step2b} <span className="text-foreground font-semibold">{s.step2bName}</span> → <span className="text-foreground font-semibold">{s.step2bCopy}</span></li>
              <li>{s.step2c} <span className="font-mono text-amber-400">123456789012345678</span>)</li>
            </ol>
          </div>

          {/* Step 3 — Discord ID input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {s.step3Label}
            </label>
            <div className="flex gap-3">
              <Input
                placeholder="123456789012345678"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ''))}
                className="max-w-xs font-mono bg-background/60"
                maxLength={20}
              />
              {discordId.length >= 17 && (
                <Badge className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 self-center">
                  {s.valid}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/60">{s.step3Hint}</p>
          </div>

          {/* Step 4 — Toggle notifications */}
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{s.step4Label}</p>
              <p className="text-xs text-muted-foreground">{s.step4Sub}</p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                notificationsEnabled ? 'bg-emerald-500' : 'bg-muted/40 border border-border/60'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-400 text-background font-semibold">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                  {s.saving}
                </span>
              ) : s.save}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !discordId.trim()} className="border-[#5865F2]/40 text-[#7289da] hover:bg-[#5865F2]/10">
              {testing ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {s.testing}
                </span>
              ) : s.testBtn}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
