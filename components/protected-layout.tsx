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
