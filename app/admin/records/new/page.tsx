'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  collection, getDocs, query, where, orderBy, addDoc, limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Boss, WeeklyPost } from '@/lib/types'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface ClientOption { id: string; displayName: string }
interface WeeklyOption { id: string; weekStart: string }

export default function NewRecordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const preselectedClientId = searchParams.get('client') ?? ''

  const [clients, setClients] = useState<ClientOption[]>([])
  const [bosses, setBosses] = useState<Boss[]>([])
  const [weeklyPosts, setWeeklyPosts] = useState<WeeklyOption[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [clientId, setClientId] = useState(preselectedClientId)
  const [bossId, setBossId] = useState('')
  const [weeklyPostId, setWeeklyPostId] = useState('none')
  const [clearedAt, setClearedAt] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientsSnap, bossesSnap, postsSnap] = await Promise.all([
          getDocs(query(collection(db, 'profiles'), where('role', '==', 'client'))),
          getDocs(query(collection(db, 'bosses'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'weekly_posts'), orderBy('weekStart', 'desc'), limit(10))),
        ])
        const clientList = clientsSnap.docs
          .map((d) => ({ id: d.id, displayName: d.data().displayName as string }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
        const bossList = bossesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Boss))
          .sort((a, b) => a.difficulty.localeCompare(b.difficulty) || a.name.localeCompare(b.name))
        setClients(clientList)
        setBosses(bossList)
        setWeeklyPosts(postsSnap.docs.map((d) => ({ id: d.id, weekStart: d.data().weekStart })))
      } catch (err) {
        console.error('Error loading data:', err)
        toast.error('Error al cargar los datos. Recarga la página.')
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !bossId) {
      toast.error('Selecciona cliente y boss.')
      return
    }
    if (!user) { toast.error('No autenticado.'); return }
    setSubmitting(true)

    try {
      await addDoc(collection(db, 'client_records'), {
        clientId,
        bossId,
        weeklyPostId: weeklyPostId === 'none' ? null : weeklyPostId,
        clearedAt,
        notes: notes || null,
        addedBy: user.uid,
        createdAt: new Date().toISOString(),
      })
      toast.success('Clear registrado.')
      router.push(`/admin/clients/${clientId}`)
    } catch {
      toast.error('Error al registrar el clear.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agregar Clear</h1>
          <p className="text-muted-foreground">Registra un boss clear para un cliente.</p>
        </div>
        <Link href="/admin/clients" className={cn(buttonVariants({ variant: 'outline' }))}>
          ← Volver
        </Link>
      </div>

      {loadingData ? (
        <p className="text-muted-foreground">Cargando datos...</p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={(val) => val && setClientId(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Boss</Label>
                <Select value={bossId} onValueChange={(val) => val && setBossId(val)}>
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
                <Select value={weeklyPostId} onValueChange={(val) => val && setWeeklyPostId(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin semana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin semana</SelectItem>
                    {weeklyPosts.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        Semana del {formatDate(w.weekStart)}
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Registrar Clear'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
