'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export function AddBossForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!difficulty) { toast.error('Selecciona una dificultad.'); return }
    setLoading(true)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('bosses').insert({ name, difficulty })

    if (error) {
      toast.error('Error al agregar boss.')
    } else {
      toast.success(`${name} (${difficulty}) agregado.`)
      setName('')
      setDifficulty('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar Boss</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="bossName">Nombre del boss</Label>
            <Input
              id="bossName"
              placeholder="Ej: Lucid, Will, Kalos..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="w-40 space-y-2">
            <Label>Dificultad</Label>
            <Select value={difficulty} onValueChange={(val) => val && setDifficulty(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Dificultad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
                <SelectItem value="Chaos">Chaos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Agregando...' : 'Agregar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
