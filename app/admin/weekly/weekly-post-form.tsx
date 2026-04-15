'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Boss } from '@/lib/types'

interface Props {
  bosses: Boss[]
}

export function WeeklyPostForm({ bosses }: Props) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() => {
    // Default to this Monday
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  })
  const [selectedBossIds, setSelectedBossIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

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
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('No autenticado.'); setLoading(false); return }

    const { data: post, error: postError } = await supabase
      .from('weekly_posts')
      .insert({ week_start: weekStart, notes: notes || null, created_by: user.id })
      .select()
      .single()

    if (postError || !post) {
      toast.error('Error al crear el post semanal.')
      setLoading(false)
      return
    }

    const { error: bossError } = await supabase.from('weekly_post_bosses').insert(
      Array.from(selectedBossIds).map((boss_id) => ({
        weekly_post_id: post.id,
        boss_id,
      }))
    )

    if (bossError) {
      toast.error('Post creado pero error al asociar bosses.')
    } else {
      toast.success(`Semana publicada con ${selectedBossIds.size} bosses.`)
      router.push('/admin')
    }
    setLoading(false)
  }

  return (
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Publicando...' : 'Publicar semana'}
      </Button>
    </form>
  )
}
