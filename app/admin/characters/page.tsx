'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { diffStyle } from '@/lib/difficulty'
import type { MapleCharacter, Boss } from '@/lib/types'

export default function AdminCharactersPage() {
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [bosses, setBosses] = useState<Record<string, Boss>>({})
  const [loading, setLoading] = useState(true)
  const [togglingBlink, setTogglingBlink] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedOcid, setExpandedOcid] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [charSnap, bossSnap] = await Promise.all([
        getDocs(collection(db, 'maple_characters')),
        getDocs(query(collection(db, 'bosses'), where('isActive', '==', true))),
      ])
      const chars = charSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as MapleCharacter))
        .sort((a, b) => a.name.localeCompare(b.name))
      const bossMap: Record<string, Boss> = {}
      bossSnap.docs.forEach((d) => { bossMap[d.id] = { id: d.id, ...d.data() } as Boss })
      setCharacters(chars)
      setBosses(bossMap)
      setLoading(false)
    }
    load()
  }, [])

  async function toggleBlink(char: MapleCharacter) {
    setTogglingBlink(char.id)
    try {
      const newVal = !char.canBlink
      await updateDoc(doc(db, 'maple_characters', char.id), { canBlink: newVal })
      setCharacters((prev) =>
        prev.map((c) => c.id === char.id ? { ...c, canBlink: newVal } : c)
      )
      toast.success(
        newVal
          ? `${char.name} ahora puede blinkear.`
          : `${char.name} ya no puede blinkear.`
      )
    } catch {
      toast.error('Error actualizando blink.')
    } finally {
      setTogglingBlink(null)
    }
  }

  async function deleteCharacter(char: MapleCharacter) {
    if (!confirm(`¿Eliminar el personaje "${char.name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(char.id)
    try {
      await deleteDoc(doc(db, 'maple_characters', char.id))
      setCharacters((prev) => prev.filter((c) => c.id !== char.id))
      toast.success(`${char.name} eliminado.`)
    } catch {
      toast.error('Error eliminando el personaje.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-cinzel text-2xl font-bold tracking-wide">Personajes Registrados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona los personajes de todos los clientes. Puedes eliminar personajes y activar/desactivar el blink.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          <span className="text-sm">Cargando personajes...</span>
        </div>
      ) : characters.length === 0 ? (
        <Card className="border-border/60 bg-card/60">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Aún no hay personajes registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="font-cinzel text-base tracking-widest uppercase">Personajes</span>
              <Badge variant="secondary" className="border-border/50 bg-secondary/80 font-semibold">
                {characters.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {characters.map((char) => {
                const selectedBosses = char.selectedBossIds
                  .map((id) => bosses[id])
                  .filter(Boolean)
                const isExpanded = expandedOcid === char.id

                return (
                  <div key={char.id} className="p-4 transition-colors hover:bg-amber-400/[0.02]">
                    <div className="flex items-center gap-4">
                      {/* Sprite */}
                      {char.imageUrl && (
                        <img
                          src={char.imageUrl}
                          alt={char.name}
                          className="h-16 w-auto object-contain flex-shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-cinzel font-bold text-foreground">{char.name}</span>
                          {char.canBlink && (
                            <Badge className="border-violet-500/40 text-violet-400 bg-violet-500/10 text-xs">
                              ⚡ Blink
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {char.class} · Lv. {char.level} · {char.world}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                          Dueño: {char.ownerDisplayName}
                        </p>
                      </div>

                      {/* Boss count */}
                      <button
                        onClick={() => setExpandedOcid(isExpanded ? null : char.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      >
                        {selectedBosses.length} boss{selectedBosses.length !== 1 ? 'es' : ''} seleccionado{selectedBosses.length !== 1 ? 's' : ''}
                        <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant={char.canBlink ? 'default' : 'outline'}
                          onClick={() => toggleBlink(char)}
                          disabled={togglingBlink === char.id}
                          className={`text-xs ${char.canBlink ? 'bg-violet-600 hover:bg-violet-700 border-violet-500' : ''}`}
                        >
                          {togglingBlink === char.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : char.canBlink ? (
                            '⚡ Blink ON'
                          ) : (
                            'Blink OFF'
                          )}
                        </Button>
                        <button
                          onClick={() => deleteCharacter(char)}
                          disabled={deleting === char.id}
                          className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                        >
                          {deleting === char.id ? '...' : 'Eliminar'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded boss list */}
                    {isExpanded && (
                      <div className="mt-3 pl-4 border-l-2 border-border/40">
                        {selectedBosses.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60">Sin bosses seleccionados.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedBosses.map((boss) => (
                              <span
                                key={boss.id}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${diffStyle(boss.difficulty)}`}
                              >
                                {boss.name}
                                {boss.price > 0 && (
                                  <span className="text-muted-foreground font-normal">
                                    · {boss.price.toLocaleString('es-ES')}
                                  </span>
                                )}
                              </span>
                            ))}
                            <span className="text-xs text-amber-400 font-semibold self-center ml-1">
                              Total: {selectedBosses.reduce((s, b) => s + (b.price || 0), 0).toLocaleString('es-ES')} mesos
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
