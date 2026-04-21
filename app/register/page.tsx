'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres.'); return }
    setSubmitting(true)
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'profiles', newUser.uid), {
        id: newUser.uid,
        email,
        displayName,
        role: 'client',
        createdAt: serverTimestamp(),
      })
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('email-already-in-use')) {
        toast.error('Este correo ya está registrado.')
      } else {
        toast.error('Error al crear cuenta. Intenta de nuevo.')
      }
    }
    setSubmitting(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,58,180,0.08) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(180,140,30,0.07) 0%, transparent 60%)' }}
      />

      {/* Card */}
      <div className="animate-slide-up relative z-10 w-full max-w-md rounded-xl border border-amber-400/15 bg-card/90 p-8 shadow-[0_0_50px_oklch(0.085_0.018_265/0.8),0_0_25px_oklch(0.62_0.22_297/0.06)] backdrop-blur-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="M8 0L9.8 6.2H16L10.9 10L12.7 16L8 12.2L3.3 16L5.1 10L0 6.2H6.2L8 0Z" fill="oklch(0.76 0.165 82)" />
            </svg>
          </div>
          <h1 className="font-cinzel text-xl font-bold tracking-widest text-amber-400 uppercase">
            Boss Clear Service
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Crea tu cuenta de cliente</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Nombre en el juego (IGN)
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="TuPersonaje"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="border-border/60 bg-input/80 focus:border-amber-400/50 focus:ring-amber-400/20 placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-border/60 bg-input/80 focus:border-amber-400/50 focus:ring-amber-400/20 placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-border/60 bg-input/80 focus:border-amber-400/50 focus:ring-amber-400/20 placeholder:text-muted-foreground/40"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-400 text-background font-bold tracking-widest uppercase hover:bg-amber-300 hover:shadow-[0_0_20px_oklch(0.76_0.165_82/0.4)] transition-all duration-300 disabled:opacity-50"
          >
            {submitting ? 'Creando cuenta...' : 'Registrarse'}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border/50" />
          <span className="text-xs text-muted-foreground/50 tracking-widest">✦</span>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        {/* Discord OAuth */}
        <a
          href="/api/auth/discord"
          className="flex w-full items-center justify-center gap-3 rounded-md border border-[#5865F2]/40 bg-[#5865F2]/10 px-4 py-2.5 text-sm font-semibold text-[#7289da] transition-all duration-300 hover:border-[#5865F2]/70 hover:bg-[#5865F2]/20 hover:shadow-[0_0_16px_#5865F2/30]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Registrarse con Discord
        </a>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-amber-400 hover:text-amber-300 transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
