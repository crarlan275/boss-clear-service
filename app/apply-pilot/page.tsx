'use client'

import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedLayout } from '@/components/protected-layout'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | null

export default function ApplyPilotPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [motivation, setMotivation] = useState('')
  const [experience, setExperience] = useState('')
  const [discord, setDiscord] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [existingStatus, setExistingStatus] = useState<ApplicationStatus>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    if (!user) return
    // Redirect if already pilot or admin
    if (profile?.role === 'pilot') { router.replace('/pilot'); return }
    if (profile?.role === 'admin') { router.replace('/admin'); return }

    // Check for existing application
    async function checkApp() {
      const snap = await getDocs(
        query(collection(db, 'pilot_applications'), where('userId', '==', user!.uid))
      )
      if (!snap.empty) {
        setExistingStatus(snap.docs[0].data().status as ApplicationStatus)
      }
      setLoadingStatus(false)
    }
    checkApp()
  }, [user, profile, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !profile) return
    if (!motivation.trim()) { toast.error('Completa el campo de motivación.'); return }
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'pilot_applications'), {
        userId: user.uid,
        displayName: profile.displayName,
        email: profile.email,
        motivation: motivation.trim(),
        experience: experience.trim() || null,
        discord: discord.trim() || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      setExistingStatus('pending')
      toast.success('Solicitud enviada. El administrador la revisará pronto.')
    } catch {
      toast.error('Error enviando la solicitud. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-card/60 p-6 backdrop-blur-sm">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,58,180,0.12) 0%, transparent 70%)' }}
          />
          <div className="relative text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/10">
              <span className="text-2xl">⚡</span>
            </div>
            <h1 className="font-cinzel text-2xl font-bold tracking-wide text-foreground">
              Solicitar ser Piloto
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Los pilotos son miembros de confianza que realizan boss clears para los clientes del servicio.
              El administrador revisará tu solicitud y te contactará.
            </p>
          </div>
        </div>

        {loadingStatus ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
            <span className="text-sm">Verificando...</span>
          </div>
        ) : existingStatus === 'pending' ? (
          <Card className="border-amber-500/30 bg-amber-950/10 backdrop-blur-sm">
            <CardContent className="py-8 text-center">
              <p className="text-2xl mb-3">⏳</p>
              <p className="font-semibold text-foreground">Solicitud en revisión</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tu solicitud está siendo revisada por el administrador. Te notificaremos cuando haya una respuesta.
              </p>
            </CardContent>
          </Card>
        ) : existingStatus === 'rejected' ? (
          <Card className="border-destructive/30 bg-destructive/5 backdrop-blur-sm">
            <CardContent className="py-8 text-center">
              <p className="text-2xl mb-3">✕</p>
              <p className="font-semibold text-foreground">Solicitud rechazada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tu solicitud no fue aprobada esta vez. Puedes contactar al administrador para más información.
              </p>
            </CardContent>
          </Card>
        ) : existingStatus === 'approved' ? (
          <Card className="border-emerald-500/30 bg-emerald-950/10 backdrop-blur-sm">
            <CardContent className="py-8 text-center">
              <p className="text-2xl mb-3">✓</p>
              <p className="font-semibold text-foreground">¡Aprobado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tu solicitud fue aprobada. El administrador activará tu rol de piloto.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="font-cinzel text-base tracking-widest uppercase">Tu Solicitud</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    ¿Por qué quieres ser piloto? *
                  </label>
                  <textarea
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Cuéntanos tu motivación para unirte al equipo..."
                    rows={4}
                    required
                    className="w-full rounded border border-border/60 bg-input/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-amber-400/50 focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    Experiencia en bosses (opcional)
                  </label>
                  <textarea
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="¿Qué bosses dominas? ¿Cuánto tiempo llevas jugando MapleStory?"
                    rows={3}
                    className="w-full rounded border border-border/60 bg-input/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-amber-400/50 focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    Usuario de Discord (opcional)
                  </label>
                  <input
                    type="text"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    placeholder="usuario#0000"
                    className="w-full rounded border border-border/60 bg-input/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-amber-400/50 focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  )
}
