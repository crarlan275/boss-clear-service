'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection, getDocs, query, where,
  doc, getDoc, updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import type { Profile, Boss, ClientRecord, WeeklyPost } from '@/lib/types'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface RecordRow {
  record: ClientRecord
  boss: Boss | null
  weeklyPost: WeeklyPost | null
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useAuth()
  const [clientId, setClientId] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pilots, setPilots] = useState<Profile[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [savingPilot, setSavingPilot] = useState(false)
  const [selectedPilotId, setSelectedPilotId] = useState<string>('')

  useEffect(() => {
    params.then((p) => setClientId(p.id))
  }, [params])

  useEffect(() => {
    if (!clientId) return
    async function fetchData() {
      try {
        // Load client profile
        const profileDoc = await getDoc(doc(db, 'profiles', clientId))
        if (!profileDoc.exists()) { router.push('/admin/clients'); return }
        const profileData = { id: profileDoc.id, ...profileDoc.data() } as Profile
        setProfile(profileData)
        setSelectedPilotId(profileData.pilotId ?? '')

        // Load pilots list
        const pilotsSnap = await getDocs(
          query(collection(db, 'profiles'), where('role', '==', 'pilot'))
        )
        const pilotList = pilotsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile))
        setPilots(pilotList)

        // Load records
        const snap = await getDocs(
          query(collection(db, 'client_records'), where('clientId', '==', clientId))
        )
        const rawRecords = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as ClientRecord))
          .sort((a, b) => b.clearedAt.localeCompare(a.clearedAt))

        const rows: RecordRow[] = await Promise.all(
          rawRecords.map(async (record) => {
            const [bossDoc, postDoc] = await Promise.all([
              getDoc(doc(db, 'bosses', record.bossId)),
              record.weeklyPostId ? getDoc(doc(db, 'weekly_posts', record.weeklyPostId)) : null,
            ])
            return {
              record,
              boss: bossDoc.exists() ? ({ id: bossDoc.id, ...bossDoc.data() } as Boss) : null,
              weeklyPost: postDoc?.exists() ? ({ id: postDoc.id, ...postDoc.data() } as WeeklyPost) : null,
            }
          })
        )
        setRecords(rows)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [clientId, router])

  async function toggleRole() {
    if (!profile) return
    const newRole = profile.role === 'admin' ? 'client' : 'admin'
    setPromoting(true)
    try {
      await updateDoc(doc(db, 'profiles', profile.id), { role: newRole })
      setProfile({ ...profile, role: newRole })
      toast.success(newRole === 'admin' ? 'Promovido a administrador.' : 'Rol cambiado a cliente.')
    } catch {
      toast.error('Error al cambiar el rol.')
    } finally {
      setPromoting(false)
    }
  }

  async function toggleBlocked() {
    if (!profile) return
    const newBlocked = !profile.blocked
    setBlocking(true)
    try {
      await updateDoc(doc(db, 'profiles', profile.id), { blocked: newBlocked })
      setProfile({ ...profile, blocked: newBlocked })
      toast.success(newBlocked ? 'Usuario bloqueado.' : 'Usuario desbloqueado.')
    } catch {
      toast.error('Error al cambiar estado de bloqueo.')
    } finally {
      setBlocking(false)
    }
  }

  async function savePilot() {
    if (!profile) return
    setSavingPilot(true)
    try {
      const update: Record<string, string | null> = { pilotId: selectedPilotId || null }
      await updateDoc(doc(db, 'profiles', profile.id), update)
      setProfile({ ...profile, pilotId: selectedPilotId || undefined })
      toast.success(selectedPilotId ? 'Piloto asignado correctamente.' : 'Piloto removido.')
    } catch {
      toast.error('Error al asignar piloto.')
    } finally {
      setSavingPilot(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando...</p>
  if (!profile) return null

  const currentPilot = pilots.find((p) => p.id === (profile.pilotId ?? ''))

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-12 w-12 rounded-full border border-border/40 object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-full border border-border/40 bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-muted-foreground">
                {profile.displayName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-cinzel text-2xl font-bold">{profile.displayName}</h1>
              {profile.blocked && (
                <Badge className="border-red-500/40 text-red-400 bg-red-500/10 text-[10px]">
                  🚫 Bloqueado
                </Badge>
              )}
              {profile.role === 'admin' && (
                <Badge className="text-[10px]">Admin</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{profile.email}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {user?.uid !== profile.id && (
            <>
              <Button
                variant={profile.role === 'admin' ? 'destructive' : 'secondary'}
                size="sm"
                onClick={toggleRole}
                disabled={promoting}
              >
                {profile.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
              </Button>
              <Button
                variant={profile.blocked ? 'secondary' : 'destructive'}
                size="sm"
                onClick={toggleBlocked}
                disabled={blocking}
              >
                {profile.blocked ? '✅ Desbloquear' : '🚫 Bloquear'}
              </Button>
            </>
          )}
          <Link
            href={`/admin/records/new?client=${profile.id}`}
            className={cn(buttonVariants())}
          >
            + Agregar Clear
          </Link>
          <Link href="/admin/clients" className={cn(buttonVariants({ variant: 'outline' }))}>
            ← Volver
          </Link>
        </div>
      </div>

      {/* ── Pilot assignment ── */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="font-cinzel text-base tracking-widest uppercase flex items-center gap-2">
            <span>⚡ Piloto Asignado</span>
            {currentPilot && (
              <Badge className="border-violet-500/40 text-violet-400 bg-violet-500/10 text-[10px]">
                {currentPilot.displayName}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <select
                value={selectedPilotId}
                onChange={(e) => setSelectedPilotId(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              >
                <option value="">— Sin piloto —</option>
                {pilots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} {p.email ? `(${p.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              onClick={savePilot}
              disabled={savingPilot || selectedPilotId === (profile.pilotId ?? '')}
            >
              {savingPilot ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
          {pilots.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              No hay pilotos registrados todavía.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Clear history ── */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="font-cinzel text-base tracking-widest uppercase flex items-center justify-between">
            <span>Historial de Clears</span>
            <Badge variant="secondary">{records.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Sin clears registrados.{' '}
              <Link
                href={`/admin/records/new?client=${profile.id}`}
                className="text-primary hover:underline"
              >
                Agrega el primero.
              </Link>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Boss</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Dificultad</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Fecha del Clear</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Semana</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(({ record, boss, weeklyPost }) => (
                  <TableRow key={record.id} className="border-border/30 hover:bg-amber-400/[0.03]">
                    <TableCell className="font-semibold text-foreground">{boss?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{boss?.difficulty ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(record.clearedAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {weeklyPost ? formatDate(weeklyPost.weekStart) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{record.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
