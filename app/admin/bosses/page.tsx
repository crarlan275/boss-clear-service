'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { toast } from 'sonner'
import { diffStyle, DIFF_ORDER } from '@/lib/difficulty'
import type { Boss } from '@/lib/types'

export default function BossesPage() {
  const [bosses, setBosses] = useState<Boss[]>([])
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadBosses() {
    const snap = await getDocs(collection(db, 'bosses'))
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boss))
    list.sort((a, b) =>
      (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99) ||
      a.name.localeCompare(b.name)
    )
    setBosses(list)
  }

  useEffect(() => { loadBosses() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!difficulty) { toast.error('Selecciona una dificultad.'); return }
    setLoading(true)
    await addDoc(collection(db, 'bosses'), { name, difficulty, isActive: true, createdAt: serverTimestamp() })
    toast.success(`${name} (${difficulty}) agregado.`)
    setName(''); setDifficulty('')
    await loadBosses()
    setLoading(false)
  }

  async function toggleBoss(id: string, isActive: boolean) {
    await updateDoc(doc(db, 'bosses', id), { isActive: !isActive })
    await loadBosses()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Bosses</h1>
          <p className="text-muted-foreground">Administra los bosses disponibles.</p>
        </div>
        <Link href="/admin" className={cn(buttonVariants({ variant: 'outline' }))}>← Volver</Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Agregar Boss</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bossName">Nombre del boss</Label>
              <Input id="bossName" placeholder="Ej: Lucid, Will, Kalos..." value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="w-40 space-y-2">
              <Label>Dificultad</Label>
              <Select value={difficulty} onValueChange={(v) => v && setDifficulty(v)}>
                <SelectTrigger><SelectValue placeholder="Dificultad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                  <SelectItem value="Chaos">Chaos</SelectItem>
                  <SelectItem value="Extreme">Extreme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>{loading ? 'Agregando...' : 'Agregar'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bosses ({bosses.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bosses.map((boss) => (
              <div key={boss.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{boss.name}</span>
                  <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${diffStyle(boss.difficulty)}`}>{boss.difficulty}</span>
                  {!boss.isActive && <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>}
                </div>
                <Button variant={boss.isActive ? 'outline' : 'secondary'} size="sm" onClick={() => toggleBoss(boss.id, boss.isActive)}>
                  {boss.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
