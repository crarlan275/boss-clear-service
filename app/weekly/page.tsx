'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { diffStyle } from '@/lib/difficulty'
import type { Boss, MapleCharacter, ClientRecord } from '@/lib/types'

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function formatWeek(d: string) {
  const start = new Date(d + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (dt: Date) => dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${fmt(start)} — ${fmt(end)}`
}

interface CharWithBosses extends MapleCharacter {
  selectedBosses: Boss[]
}

export default function WeeklyPage() {
  const { user } = useAuth()
  const [characters, setCharacters] = useState<CharWithBosses[]>([])
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set())
  const [weekRecords, setWeekRecords] = useState<Record<string, ClientRecord>>({})
  const [loading, setLoading] = useState(true)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const weekStart = getWeekStart()

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const [charSnap, bossSnap, recSnap] = await Promise.all([
          getDocs(query(collection(db, 'maple_characters'), where('ownerId', '==', user!.uid))),
          getDocs(query(collection(db, 'bosses'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'client_records'), where('clientId', '==', user!.uid))),
        ])

        const bossMap: Record<string, Boss> = {}
        bossSnap.docs.forEach((d) => { bossMap[d.id] = { id: d.id, ...d.data() } as Boss })

        const chars: CharWithBosses[] = charSnap.docs
          .map((d) => {
            const char = { id: d.id, ...d.data() } as MapleCharacter
            return {
              ...char,
              selectedBosses: char.selectedBossIds.map((id) => bossMap[id]).filter(Boolean),
            }
          })
          .filter((c) => c.selectedBosses.length > 0)
        setCharacters(chars)

        // Clears de esta semana — llave por charId:bossId
        // Records sin charId (legacy) se ignoran para evitar falsos positivos entre personajes
        const keys = new Set<string>()
        const recMap: Record<string, ClientRecord> = {}
        recSnap.docs.forEach((d) => {
          const r = { id: d.id, ...d.data() } as ClientRecord
          if (r.clearedAt >= weekStart && r.charId) {
            const key = `${r.charId}:${r.bossId}`
            keys.add(key)
            recMap[key] = r
          }
        })
        setClearedIds(keys)
        setWeekRecords(recMap)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const totalBosses = characters.reduce((s, c) => s + c.selectedBosses.length, 0)
  const totalCleared = characters.reduce((s, c) => s + c.selectedBosses.filter((b) => clearedIds.has(`${c.id}:${b.id}`)).length, 0)
  const totalPending = totalBosses - totalCleared

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-amber-400/15 bg-card/60 p-6 backdrop-blur-sm">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 120% at 100% 50%, rgba(180,140,30,0.09) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-400/70 mb-1">Esta semana</p>
          <h1 className="font-cinzel text-3xl font-bold text-foreground">Bosses de esta semana</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatWeek(weekStart)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          <span className="text-sm">Cargando...</span>
        </div>
      ) : characters.length === 0 ? (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No tienes personajes con bosses seleccionados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total', value: totalBosses, color: 'text-foreground', border: 'border-border/60' },
              { label: 'Completados', value: totalCleared, color: 'text-emerald-400', border: 'border-emerald-500/20' },
              { label: 'Pendientes', value: totalPending, color: 'text-amber-400', border: 'border-amber-500/20' },
            ].map((s) => (
              <Card key={s.label} className={`border ${s.border} bg-card/60 text-center backdrop-blur-sm`}>
                <CardContent className="py-5">
                  <p className={`font-cinzel text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-xs font-semibold tracking-widest uppercase text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Characters */}
          <div className="space-y-5">
            {characters.map((char) => {
              const charCleared = char.selectedBosses.filter((b) => clearedIds.has(`${char.id}:${b.id}`)).length
              return (
                <Card key={char.id} className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
                  {/* Character header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                    {char.imageUrl && (
                      <img src={char.imageUrl} alt={char.name}
                        className="h-12 w-auto object-contain flex-shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-cinzel font-bold text-foreground">{char.name}</p>
                      <p className="text-xs text-muted-foreground">{char.class} · Lv. {char.level}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold flex-shrink-0">
                      <span className="text-emerald-400">✓ {charCleared}</span>
                      <span className="text-muted-foreground/40">/</span>
                      <span className="text-muted-foreground">{char.selectedBosses.length}</span>
                    </div>
                  </div>

                  {/* Boss grid */}
                  <div className="p-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {char.selectedBosses.map((boss) => {
                      const key = `${char.id}:${boss.id}`
                      const isCleared = clearedIds.has(key)
                      const rec = weekRecords[key]
                      return (
                        <div
                          key={boss.id}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-all ${
                            isCleared
                              ? 'border-emerald-500/40 bg-emerald-950/20'
                              : 'border-border/30 bg-background/20 opacity-55'
                          }`}
                        >
                          {boss.imageUrl ? (
                            <img src={boss.imageUrl} alt={boss.name}
                              className={`h-10 w-10 rounded object-cover ${isCleared ? '' : 'grayscale'}`} />
                          ) : (
                            <div className={`h-10 w-10 rounded bg-muted/30 ${isCleared ? '' : 'grayscale'}`} />
                          )}
                          <p className="text-[11px] font-semibold text-foreground leading-tight">{boss.name}</p>
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold ${diffStyle(boss.difficulty)}`}>
                            {boss.difficulty}
                          </span>
                          {isCleared ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-emerald-400">✓ Completado</span>
                              {rec?.imageUrls && rec.imageUrls.length > 0 && (
                                <button
                                  onClick={() => setExpandedImage(expandedImage === rec.imageUrls![0] ? null : rec.imageUrls![0])}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                                >
                                  📷 Ver foto
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">Pendiente</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Lightbox */}
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
