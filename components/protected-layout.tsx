'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
  requirePilot?: boolean  // allows pilot OR admin
}

export function ProtectedLayout({ children, requireAdmin = false, requirePilot = false }: Props) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (requireAdmin && profile?.role !== 'admin') { router.replace('/dashboard'); return }
    const hasPilotAccess = profile?.role === 'pilot' || profile?.role === 'admin' || profile?.isPilot === true
    if (requirePilot && !hasPilotAccess) {
      router.replace('/dashboard'); return
    }
  }, [user, profile, loading, requireAdmin, requirePilot, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Cargando...</div>
      </div>
    )
  }

  // Blocked user — show message instead of content
  if (profile?.blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full rounded-xl border border-red-500/30 bg-red-950/20 p-8 text-center space-y-4 backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-2xl">
            🚫
          </div>
          <div>
            <h2 className="font-cinzel text-xl font-bold text-red-400">Cuenta bloqueada</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu cuenta ha sido suspendida. Contacta a un administrador si crees que es un error.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const hasPilotAccess = profile?.role === 'pilot' || profile?.role === 'admin' || profile?.isPilot === true
  if (requireAdmin && profile?.role !== 'admin') return null
  if (requirePilot && !hasPilotAccess) return null

  return (
    <div className="min-h-screen">
      {profile && <Navbar profile={profile} />}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
