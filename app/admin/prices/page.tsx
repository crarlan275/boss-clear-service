'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { diffStyle, DIFF_ORDER } from '@/lib/difficulty'
import type { Boss } from '@/lib/types'

export default function PricesPage() {
  const [bosses, setBosses] = useState<Boss[]>([])
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'bosses'))
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Boss))
        .sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || a.name.localeCompare(b.name))
      setBosses(list)
      const initial: Record<string, string> = {}
      list.forEach((b) => { initial[b.id] = b.price != null ? String(b.price) : '0' })
      setPrices(initial)
      setLoading(false)
    }
    load()
  }, [])

  async function savePrice(boss: Boss) {
    const raw = prices[boss.id]?.trim()
    const num = raw === '' ? 0 : Number(raw)
    if (isNaN(num) || num < 0) {
      toast.error('Ingresa un precio válido (número positivo).')
      return
    }
    setSaving((s) => ({ ...s, [boss.id]: true }))
    try {
      await updateDoc(doc(db, 'bosses', boss.id), { price: num })
      setBosses((prev) => prev.map((b) => b.id === boss.id ? { ...b, price: num } : b))
      toast.success(`Precio de ${boss.name} actualizado.`)
    } catch {
      toast.error('Error guardando el precio.')
    } finally {
      setSaving((s) => ({ ...s, [boss.id]: false }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-cinzel text-2xl font-bold tracking-wide">Precios de Bosses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Establece el precio por boss clear. Los clientes verán estos precios al seleccionar sus bosses.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          <span className="text-sm">Cargando bosses...</span>
        </div>
      ) : bosses.length === 0 ? (
        <Card className="border-border/60 bg-card/60">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No hay bosses en el catálogo. Agrégalos en{' '}
              <a href="/admin/bosses" className="text-amber-400 hover:underline">Gestionar Bosses</a>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="font-cinzel text-base tracking-widest uppercase">
              Catálogo de Precios
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {bosses.map((boss) => (
                <div
                  key={boss.id}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-amber-400/[0.02] ${
                    !boss.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{boss.name}</span>
                      {!boss.isActive && (
                        <span className="text-xs text-muted-foreground/50">(inactivo)</span>
                      )}
                    </div>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold mt-0.5 ${diffStyle(boss.difficulty)}`}>
                      {boss.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={prices[boss.id] ?? '0'}
                        onChange={(e) => setPrices((p) => ({ ...p, [boss.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && savePrice(boss)}
                        className="w-36 bg-background/60 text-right"
                        placeholder="0"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12">mesos</span>
                    <Button
                      size="sm"
                      onClick={() => savePrice(boss)}
                      disabled={saving[boss.id]}
                      className="w-20"
                    >
                      {saving[boss.id] ? (
                        <span className="flex items-center gap-1.5">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        </span>
                      ) : (
                        'Guardar'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
