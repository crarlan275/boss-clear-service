'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  collection, query, where, getDocs, doc, setDoc, deleteDoc,
  getDoc, updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { diffStyle, diffSelectedStyle, DIFF_ORDER } from '@/lib/difficulty'
import { useLang } from '@/lib/i18n'
import type { MapleCharacter, Boss } from '@/lib/types'

type SearchResult = {
  name: string; world: string; class: string; level: number; imageUrl: string
}

// ── BossGroup ─────────────────────────────────────────────────────────────────

function BossGroup({
  bossName,
  difficulties,
  selectedIds,
  onToggle,
  locked,
}: {
  bossName: string
  difficulties: Boss[]
  selectedIds: string[]
  onToggle: (bossId: string, bossName: string) => void
  locked?: boolean
}) {
  const selected = difficulties.find((b) => selectedIds.includes(b.id))

  const imageUrl = difficulties[0]?.imageUrl

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
        selected
          ? 'border-white/10 bg-white/[0.03]'
          : 'border-border/30 bg-background/20'
      } ${locked ? 'opacity-70' : ''}`}
    >
      {/* Boss portrait */}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={bossName}
            className="h-full w-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="h-full w-full bg-muted/20" />
        )}
        {/* dim overlay when not selected */}
        {!selected && <div className="absolute inset-0 bg-black/50" />}
      </div>

      <span className={`w-36 flex-shrink-0 text-sm font-semibold ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
        {bossName}
      </span>

      <div className="flex flex-wrap gap-2 flex-1">
        {difficulties.map((boss) => {
          const isSelected = selectedIds.includes(boss.id)
          return (
            <button
              key={boss.id}
              onClick={() => !locked && onToggle(boss.id, bossName)}
              disabled={locked}
              title={locked ? 'Selección bloqueada por tu piloto' : undefined}
              className={`inline-flex items-center rounded border px-3 py-1 text-xs font-bold tracking-wide uppercase transition-all ${
                isSelected
                  ? diffSelectedStyle(boss.difficulty)
                  : 'border-border/30 text-muted-foreground/50 bg-transparent hover:border-border/60 hover:text-muted-foreground'
              } ${locked ? 'cursor-not-allowed' : ''}`}
            >
              {boss.difficulty}
            </button>
          )
        })}
      </div>

      {selected && selected.price > 0 && (
        <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
          {selected.price.toLocaleString('es-ES')}
        </span>
      )}
    </div>
  )
}

// ── MiniCard (vista contraída) ────────────────────────────────────────────────

function BossMiniCard({ difficulty }: { difficulty: Boss }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-black/30 pl-0.5 pr-3 py-0.5">
      {difficulty.imageUrl ? (
        <img
          src={difficulty.imageUrl}
          alt={difficulty.name}
          className="h-9 w-9 rounded-md object-cover flex-shrink-0 border border-white/10"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <span className="h-9 w-9 rounded-md bg-muted/30 flex-shrink-0" />
      )}
      <span className="text-[11px] font-bold tracking-wide text-muted-foreground whitespace-nowrap">
        {difficulty.difficulty} {difficulty.name}
      </span>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function CharacterPage() {
  const { user } = useAuth()
  const { t } = useLang()

  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [bosses, setBosses] = useState<Boss[]>([])
  const [loadingChars, setLoadingChars] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const [searchName, setSearchName] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [searchError, setSearchError] = useState('')
  const [registering, setRegistering] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    const [charSnap, bossSnap] = await Promise.all([
      getDocs(query(collection(db, 'maple_characters'), where('ownerId', '==', user.uid))),
      getDocs(query(collection(db, 'bosses'), where('isActive', '==', true))),
    ])
    const chars = charSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as MapleCharacter)
    setCharacters(chars)
    // Al cargar, expandir todos los personajes por defecto
    setExpandedIds(new Set(chars.map((c) => c.id)))
    setBosses(bossSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Boss))
    setLoadingChars(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const bossGroups = useMemo(() => {
    const map = new Map<string, Boss[]>()
    const sorted = [...bosses].sort((a, b) => {
      const da = a.createdAt || ''
      const db_ = b.createdAt || ''
      if (da !== db_) return da.localeCompare(db_)
      return (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99)
    })
    for (const boss of sorted) {
      if (!map.has(boss.name)) map.set(boss.name, [])
      map.get(boss.name)!.push(boss)
    }
    return map
  }, [bosses])

  // ── search ──────────────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchName.trim()) return
    setSearching(true)
    setSearchResult(null)
    setSearchError('')
    try {
      const res = await fetch(`/api/maple/character?name=${encodeURIComponent(searchName.trim())}`)
      const data = await res.json()
      if (!res.ok) { setSearchError(data.error || t.char.notFound); return }
      setSearchResult(data)
    } catch {
      setSearchError(t.char.connError)
    } finally {
      setSearching(false)
    }
  }

  // ── register ────────────────────────────────────────────────────────────────
  async function handleRegister() {
    if (!searchResult || !user) return
    setRegistering(true)
    try {
      const docId = searchResult.name.toLowerCase()
      try {
        const existing = await getDoc(doc(db, 'maple_characters', docId))
        if (existing.exists()) { toast.info(t.char.alreadyRegistered); return }
      } catch {
        toast.error(t.char.takenByOther)
        return
      }
      await setDoc(doc(db, 'maple_characters', docId), {
        name: searchResult.name,
        class: searchResult.class,
        level: searchResult.level,
        world: searchResult.world,
        imageUrl: searchResult.imageUrl,
        ownerId: user.uid,
        ownerDisplayName: user.displayName || user.email || user.uid,
        canBlink: false,
        selectedBossIds: [],
        createdAt: new Date().toISOString(),
      })
      toast.success(t.char.registerSuccess(searchResult.name))
      setSearchResult(null)
      setSearchName('')
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error(t.char.registerError)
    } finally {
      setRegistering(false)
    }
  }

  // ── boss toggle (radio: solo una dificultad por boss) ───────────────────────
  async function toggleBoss(char: MapleCharacter, bossId: string, bossName: string) {
    const isSelected = char.selectedBossIds.includes(bossId)

    // IDs de otras dificultades del mismo boss que estén seleccionadas
    const sameBossIds = (bossGroups.get(bossName) ?? [])
      .map((b) => b.id)
      .filter((id) => id !== bossId && char.selectedBossIds.includes(id))

    let newIds: string[]
    if (isSelected) {
      // Deseleccionar la actual
      newIds = char.selectedBossIds.filter((id) => id !== bossId)
    } else {
      // Quitar las otras dificultades del mismo boss, añadir la nueva
      newIds = [
        ...char.selectedBossIds.filter((id) => !sameBossIds.includes(id)),
        bossId,
      ]
    }

    try {
      await updateDoc(doc(db, 'maple_characters', char.id), { selectedBossIds: newIds })
      setCharacters((prev) =>
        prev.map((c) => c.id === char.id ? { ...c, selectedBossIds: newIds } : c)
      )
    } catch {
      toast.error(t.char.updateError)
    }
  }

  // ── expand/collapse ─────────────────────────────────────────────────────────
  function toggleExpand(charId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(charId) ? next.delete(charId) : next.add(charId)
      return next
    })
  }

  // ── remove character ────────────────────────────────────────────────────────
  async function removeCharacter(id: string, name: string) {
    if (!confirm(t.char.confirmDelete(name))) return
    try {
      await deleteDoc(doc(db, 'maple_characters', id))
      setCharacters((prev) => prev.filter((c) => c.id !== id))
      toast.success(t.char.deleteSuccess)
    } catch {
      toast.error(t.char.deleteError)
    }
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-amber-400/15 bg-card/60 p-6 backdrop-blur-sm">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 120% at 100% 50%, rgba(180,140,30,0.09) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-400/70 mb-1">{t.char.subtitle}</p>
          <h1 className="font-cinzel text-3xl font-bold text-foreground">{t.char.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.char.description}</p>
        </div>
      </div>

      {/* Search & Register */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <CardTitle className="font-cinzel text-base tracking-widest uppercase">{t.char.addTitle}</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              placeholder={t.char.searchPlaceholder}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="max-w-sm bg-background/60"
            />
            <Button type="submit" disabled={searching || !searchName.trim()}>
              {searching
                ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />{t.char.searching}</span>
                : t.char.search}
            </Button>
          </form>
          {searchError && <p className="mt-3 text-sm text-destructive">{searchError}</p>}
          {searchResult && (
            <div className="mt-4 flex items-center gap-4 rounded-lg border border-border/60 bg-background/50 p-4">
              {searchResult.imageUrl && (
                <img src={searchResult.imageUrl} alt={searchResult.name}
                  className="h-20 w-auto object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              )}
              <div className="flex-1">
                <p className="font-cinzel text-lg font-bold text-foreground">{searchResult.name}</p>
                <p className="text-sm text-muted-foreground">
                  {searchResult.class} · Lv. {searchResult.level} · {searchResult.world}
                </p>
              </div>
              <Button onClick={handleRegister} disabled={registering}>
                {registering ? t.char.registering : t.char.register}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Character list */}
      {loadingChars ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          <span className="text-sm">{t.char.loading}</span>
        </div>
      ) : characters.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-card/40 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t.char.noChars}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {characters.map((char) => {
            const isExpanded = expandedIds.has(char.id)
            const selectedBosses = bosses.filter((b) => char.selectedBossIds.includes(b.id))
            const total = selectedBosses.reduce((sum, b) => sum + (b.price || 0), 0)

            return (
              <Card key={char.id} className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">

                {/* Character header */}
                <div className="flex items-center gap-4 border-b border-border/40 p-4">
                  {char.imageUrl && (
                    <img src={char.imageUrl} alt={char.name}
                      className="h-20 w-auto object-contain flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-cinzel text-xl font-bold text-foreground">{char.name}</h2>
                      {char.canBlink && (
                        <Badge className="border-violet-500/40 text-violet-400 bg-violet-500/10 text-xs">
                          {t.char.canBlink}
                        </Badge>
                      )}
                      {char.bossesLocked && (
                        <Badge className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs gap-1">
                          🔒 Bosses bloqueados
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {char.class} · Lv. {char.level} · {char.world}
                    </p>
                    {total > 0 && !isExpanded && (
                      <p className="text-xs font-semibold text-amber-400 mt-0.5">
                        {t.char.bossCount(selectedBosses.length)} · {total.toLocaleString('es-ES')} {t.char.mesos}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Toggle expand */}
                    <button
                      onClick={() => toggleExpand(char.id)}
                      className="rounded border border-border/40 bg-background/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-border hover:text-foreground flex items-center gap-1.5"
                    >
                      {isExpanded ? (
                        <><span className="text-[10px]">▲</span> {t.char.collapse}</>
                      ) : (
                        <><span className="text-[10px]">▼</span> {t.char.expand}</>
                      )}
                    </button>
                    <button
                      onClick={() => removeCharacter(char.id, char.name)}
                      className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/20"
                    >
                      {t.char.delete}
                    </button>
                  </div>
                </div>

                {/* ── EXPANDED: full boss list ──────────────────────────────── */}
                {isExpanded && (
                  <CardContent className="p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t.char.bosses}
                    </p>
                    {char.bossesLocked && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5">
                        <span className="text-base">🔒</span>
                        <p className="text-xs font-semibold text-amber-400">
                          Selección bloqueada por tu piloto. No puedes modificar los bosses hasta que el piloto los desbloquee.
                        </p>
                      </div>
                    )}
                    {bossGroups.size === 0 ? (
                      <p className="text-sm text-muted-foreground">{t.char.noBosses}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {Array.from(bossGroups.entries()).map(([bossName, difficulties]) => (
                          <BossGroup
                            key={bossName}
                            bossName={bossName}
                            difficulties={difficulties}
                            selectedIds={char.selectedBossIds}
                            onToggle={(bossId, name) => toggleBoss(char, bossId, name)}
                            locked={char.bossesLocked}
                          />
                        ))}
                      </div>
                    )}
                    {selectedBosses.length > 0 && (
                      <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">
                          {t.char.selected(selectedBosses.length)}
                        </span>
                        {total > 0 && (
                          <span className="text-sm font-bold text-amber-400">
                            {t.char.total}: {total.toLocaleString('es-ES')} {t.char.mesos}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}

                {/* ── COLLAPSED: mini cards per boss ───────────────────────── */}
                {!isExpanded && selectedBosses.length > 0 && (
                  <div className="px-4 py-4 border-t border-border/30 space-y-2">
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
                      {selectedBosses.map((boss) => (
                        <BossMiniCard key={boss.id} difficulty={boss} />
                      ))}
                    </div>
                    {total > 0 && (
                      <div className="text-right text-sm font-bold text-amber-400">
                        {total.toLocaleString('es-ES')} {t.char.mesos}
                      </div>
                    )}
                  </div>
                )}

                {!isExpanded && selectedBosses.length === 0 && (
                  <div className="px-4 py-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground/50">{t.char.noBossesSelected}</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
