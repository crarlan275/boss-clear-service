'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Boss } from '@/lib/types'

function getThisMonday() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export default function WeeklyAdminPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [bosses, setBosses] = useState<Boss[]>([])
  const [loadingBosses, setLoadingBosses] = useState(true)
  const [weekStart, setWeekStart] = useState(getThisMonday)
  const [selectedBossIds, setSelectedBossIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchBosses() {
      try {
        const snap = await getDocs(query(collection(db, 'bosses'), where('isActive', '==', true)))
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Boss))
          .sort((a, b) => a.difficulty.localeCompare(b.difficulty) || a.name.localeCompare(b.name))
        setBosses(list)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingBosses(false)
      }
    }
    fetchBosses()
  }, [])

  function toggleBoss(id: string) {
    setSelectedBossIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const grouped: Record<string, Boss[]> = {}
  for (const boss of bosses) {
    if (!grouped[boss.difficulty]) grouped[boss.difficulty] = []
    grouped[boss.difficulty].push(boss)
  }
  const difficultyOrder = ['Chaos', 'Hard', 'Normal']
  const sortedDifficulties = Object.keys(grouped).sort(
    (a, b) => difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b)
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedBossIds.size === 0) {
      toast.error('Selecciona al menos un boss.')
      return
    }
    if (!user) { toast.error('No autenticado.'); return }
    setSubmitting(true)

    try {
      await addDoc(collection(db, 'weekly_posts'), {
        weekStart,
        notes: notes || null,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        bossIds: Array.from(selectedBossIds),
      })
      toast.success(`Semana publicada con ${selectedBossIds.size} bosses.`)
      router.push('/admin')
    } catch {
      toast.error('Error al publicar la semana.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publicar Bosses Semanales</h1>
          <p className="text-muted-foreground">Selecciona qué bosses completaste esta semana.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/weekly/history" className={cn(buttonVariants({ variant: 'outline' }))}>
            Ver Historial
          </Link>
          <Link href="/admin" className={cn(buttonVariants({ variant: 'outline' }))}>
            ← Volver
          </Link>
        </div>
      </div>

      {loadingBosses ? (
        <p className="text-muted-foreground">Cargando bosses...</p>
      ) : bosses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay bosses activos.{' '}
            <Link href="/admin/bosses" className="text-primary hover:underline">
              Agrega bosses primero.
            </Link>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Detalles de la semana</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weekStart">Inicio de semana (lunes del reset)</Label>
                <Input
                  id="weekStart"
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ej: Slots disponibles, info extra..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Bosses completados{' '}
                <Badge variant="secondary">{selectedBossIds.size} seleccionados</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedDifficulties.map((difficulty) => (
                <div key={difficulty}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{difficulty}</h3>
                  <div className="flex flex-wrap gap-2">
                    {grouped[difficulty].map((boss) => {
                      const selected = selectedBossIds.has(boss.id)
                      return (
                        <button
                          key={boss.id}
                          type="button"
                          onClick={() => toggleBoss(boss.id)}
                          className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          }`}
                        >
                          {boss.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Publicando...' : 'Publicar semana'}
          </Button>
        </form>
      )}
    </div>
  )
}
