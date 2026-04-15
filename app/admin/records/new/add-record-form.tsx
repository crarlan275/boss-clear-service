'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Boss } from '@/lib/types'

interface Props {
  clients: { id: string; display_name: string }[]
  bosses: Boss[]
  weeklyPosts: { id: string; week_start: string }[]
  preselectedClientId?: string
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function AddRecordForm({ clients, bosses, weeklyPosts, preselectedClientId }: Props) {
  const router = useRouter()
  const [clientId, setClientId] = useState(preselectedClientId ?? '')
  const [bossId, setBossId] = useState('')
  const [weeklyPostId, setWeeklyPostId] = useState('none')
  const [clearedAt, setClearedAt] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !bossId) {
      toast.error('Selecciona cliente y boss.')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('No autenticado.'); setLoading(false); return }

    const { error } = await supabase.from('client_records').insert({
      client_id: clientId,
      boss_id: bossId,
      weekly_post_id: weeklyPostId === 'none' ? null : weeklyPostId,
      cleared_at: clearedAt,
      notes: notes || null,
      added_by: user.id,
    })

    if (error) {
      toast.error('Error al registrar el clear.')
    } else {
      toast.success('Clear registrado.')
      router.push(`/admin/clients/${clientId}`)
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Boss</Label>
            <Select value={bossId} onValueChange={setBossId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona boss..." />
              </SelectTrigger>
              <SelectContent>
                {bosses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.difficulty})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clearedAt">Fecha del clear</Label>
            <Input
              id="clearedAt"
              type="date"
              value={clearedAt}
              onChange={(e) => setClearedAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Semana asociada (opcional)</Label>
            <Select value={weeklyPostId} onValueChange={setWeeklyPostId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin semana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin semana</SelectItem>
                {weeklyPosts.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    Semana del {formatDate(w.week_start)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ej: Split run, mule, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar Clear'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
