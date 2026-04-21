'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { diffStyle } from '@/lib/difficulty'
import type { ClientRecord, Boss, WeeklyPost, Profile } from '@/lib/types'

interface RecordWithDetails extends ClientRecord {
  boss: Boss
  weeklyPost: WeeklyPost | null
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [records, setRecords] = useState<RecordWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [pilot, setPilot] = useState<Profile | null>(null)

  useEffect(() => {
    if (!user || !profile) return
    async function load() {
      // Load pilot if assigned
      if (profile?.pilotId) {
        const pilotSnap = await getDoc(doc(db, 'profiles', profile.pilotId))
        if (pilotSnap.exists()) setPilot({ id: pilotSnap.id, ...pilotSnap.data() } as Profile)
      }

      // Load all records for history
      const recQ = query(collection(db, 'client_records'), where('clientId', '==', user!.uid))
      const recSnap = await getDocs(recQ)
      const results: RecordWithDetails[] = []
      for (const d of recSnap.docs) {
        const record = { id: d.id, ...d.data() } as ClientRecord
        const bossSnap = await getDoc(doc(db, 'bosses', record.bossId))
        const boss = bossSnap.exists() ? { id: bossSnap.id, ...bossSnap.data() } as Boss : null
        let weeklyPost: WeeklyPost | null = null
        if (record.weeklyPostId) {
          const wpSnap = await getDoc(doc(db, 'weekly_posts', record.weeklyPostId))
          if (wpSnap.exists()) weeklyPost = { id: wpSnap.id, ...wpSnap.data() } as WeeklyPost
        }
        if (boss) results.push({ ...record, boss, weeklyPost })
      }
      results.sort((a, b) => b.clearedAt.localeCompare(a.clearedAt))
      setRecords(results)
      setLoading(false)
    }
    load()
  }, [user, profile])

  const weekStart = getWeekStart()
  const clearedThisWeek = records.filter((r) => r.clearedAt >= weekStart).length
  // Weeks active = weeks that have at least one clear
  const activeWeeks = new Set(
    records.map((r) => {
      const d = new Date(r.clearedAt + 'T00:00:00')
      const day = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      return monday.toISOString().split('T')[0]
    })
  ).size

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-amber-400/15 bg-card/60 p-6 backdrop-blur-sm">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 120% at 100% 50%, rgba(180,140,30,0.09) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-400/70 mb-1">Bienvenido de vuelta</p>
          <h1 className="font-cinzel text-3xl font-bold text-foreground">
            {profile?.displayName ?? 'Jugador'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Aquí está tu historial de boss clears.</p>
        </div>
      </div>

      {/* ── Piloto asignado ─────────────────────────── */}
      {pilot && (
        <div className="relative overflow-hidden rounded-xl border border-violet-500/25 bg-violet-950/10 px-5 py-4 backdrop-blur-sm flex items-center gap-4">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 60% 120% at 0% 50%, rgba(99,58,180,0.12) 0%, transparent 70%)' }}
          />
          {/* Icon / avatar */}
          <div className="relative flex-shrink-0">
            {pilot.avatarUrl ? (
              <img
                src={pilot.avatarUrl}
                alt={pilot.displayName}
                className="h-11 w-11 rounded-full border-2 border-violet-500/40 object-cover shadow-[0_0_14px_rgba(99,58,180,0.35)]"
              />
            ) : (
              <div className="h-11 w-11 rounded-full border-2 border-violet-500/40 bg-violet-500/15 flex items-center justify-center shadow-[0_0_14px_rgba(99,58,180,0.35)]">
                <span className="text-sm font-bold text-violet-400">
                  {pilot.displayName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-violet-500/60 bg-violet-600 text-[9px]">⚡</span>
          </div>
          {/* Info */}
          <div className="relative min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-violet-400/80 mb-0.5">
              Tu piloto encargado
            </p>
            <p className="font-cinzel font-bold text-foreground leading-tight">{pilot.displayName}</p>
            {pilot.email && (
              <p className="text-xs text-muted-foreground truncate">{pilot.email}</p>
            )}
          </div>
          <Badge className="relative ml-auto flex-shrink-0 border-violet-500/40 text-violet-400 bg-violet-500/10 text-[10px]">
            Piloto activo
          </Badge>
        </div>
      )}

      {/* ── Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Clears', value: loading ? '—' : records.length, color: 'text-amber-400', border: 'border-amber-500/20' },
          { label: 'Esta semana', value: loading ? '—' : clearedThisWeek, color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Semanas activas', value: loading ? '—' : activeWeeks, color: 'text-sky-400', border: 'border-sky-500/20' },
        ].map((stat) => (
          <Card key={stat.label} className={`border ${stat.border} bg-card/60 text-center backdrop-blur-sm`}>
            <CardContent className="py-5">
              <p className={`font-cinzel text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs font-semibold tracking-widest uppercase text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Records table ───────────────────────────── */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="font-cinzel text-base tracking-widest uppercase">Historial de Clears</span>
            <Badge variant="secondary" className="border-border/50 bg-secondary/80 font-semibold">
              {records.length} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
              <span className="text-sm">Cargando clears...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border/50 text-muted-foreground/40">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L9.8 6.2H16L10.9 10L12.7 16L8 12.2L3.3 16L5.1 10L0 6.2H6.2L8 0Z" fill="currentColor" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">Aún no tienes clears registrados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Boss</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Dificultad</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Semana</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Notas</TableHead>
                  <TableHead className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Foto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="border-border/30 transition-colors hover:bg-amber-400/[0.03]">
                    <TableCell className="font-semibold text-foreground">{r.boss.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${diffStyle(r.boss.difficulty)}`}>
                        {r.boss.difficulty}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(r.clearedAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.weeklyPost ? formatDate(r.weeklyPost.weekStart) : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.notes ?? <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell>
                      {r.imageUrls && r.imageUrls.length > 0 ? (
                        <button
                          onClick={() => setExpandedImage(expandedImage === r.imageUrls![0] ? null : r.imageUrls![0])}
                          className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
                        >
                          📷
                        </button>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Global image lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Clear screenshot"
            className="max-h-[80vh] max-w-[90vw] rounded-xl border border-border/40 object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 rounded-full border border-border/60 bg-background/80 p-2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
