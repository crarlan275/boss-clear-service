'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { Profile } from '@/lib/types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function ClientsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const snap = await getDocs(collection(db, 'profiles'))
        setProfiles(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Profile))
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
        )
      } finally {
        setLoading(false)
      }
    }
    fetchProfiles()
  }, [])

  const clients = profiles.filter((p) => p.role === 'client')
  const pilots = profiles.filter((p) => p.role === 'pilot')
  const admins = profiles.filter((p) => p.role === 'admin')
  const pilotMap = Object.fromEntries(pilots.map((p) => [p.id, p.displayName]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cinzel text-2xl font-bold tracking-wide">Clientes</h1>
          <p className="text-muted-foreground mt-1">{clients.length} clientes registrados.</p>
        </div>
        <Link href="/admin" className={cn(buttonVariants({ variant: 'outline' }))}>
          ← Volver
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          <span className="text-sm">Cargando clientes...</span>
        </div>
      )}

      {!loading && (
        <>
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="font-cinzel text-base tracking-widest uppercase">Clientes</span>
                <Badge variant="secondary" className="border-border/50 bg-secondary/80 font-semibold">
                  {clients.length} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No hay clientes registrados aún.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {clients.map((client) => {
                    const pilotName = client.pilotId ? pilotMap[client.pilotId] : null
                    return (
                      <div
                        key={client.id}
                        className="flex items-center gap-4 p-4 transition-colors hover:bg-amber-400/[0.02]"
                      >
                        {client.avatarUrl ? (
                          <img
                            src={client.avatarUrl}
                            alt={client.displayName}
                            className="h-9 w-9 rounded-full border border-border/40 flex-shrink-0 object-cover"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full border border-border/40 bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-muted-foreground">
                              {client.displayName.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-cinzel font-bold text-foreground">{client.displayName}</span>
                            {pilotName ? (
                              <Badge className="border-violet-500/40 text-violet-400 bg-violet-500/10 text-[10px]">
                                ⚡ {pilotName}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground/60">
                                Sin piloto
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                          <p className="text-xs text-muted-foreground/60">
                            Registrado: {formatDate(client.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Link
                            href={`/admin/clients/${client.id}`}
                            className={cn(buttonVariants({ size: 'sm' }))}
                          >
                            Ver Clears
                          </Link>
                          <Link
                            href={`/admin/records/new?client=${client.id}`}
                            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                          >
                            + Clear
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {admins.length > 0 && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="font-cinzel text-base tracking-widest uppercase">Administradores</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {admins.map((admin) => (
                    <div key={admin.id} className="flex items-center gap-3 p-4">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{admin.displayName}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                      <Badge>Admin</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
