'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection, getDocs, query, where,
  doc, getDoc, updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import type { Profile, Boss, ClientRecord, WeeklyPost } from '@/lib/types'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

interface RecordRow {
  record: ClientRecord
  boss: Boss | null
  weeklyPost: WeeklyPost | null
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useAuth()
  const [clientId, setClientId] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [records, setRecords] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)

  useEffect(() => {
    params.then((p) => setClientId(p.id))
  }, [params])

  useEffect(() => {
    if (!clientId) return
    async function fetchData() {
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', clientId))
        if (!profileDoc.exists()) { router.push('/admin/clients'); return }
        const profileData = { id: profileDoc.id, ...profileDoc.data() } as Profile
        setProfile(profileData)

        const snap = await getDocs(
          query(collection(db, 'client_records'), where('clientId', '==', clientId))
        )
        const rawRecords = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as ClientRecord))
          .sort((a, b) => b.clearedAt.localeCompare(a.clearedAt))

        const rows: RecordRow[] = await Promise.all(
          rawRecords.map(async (record) => {
            const [bossDoc, postDoc] = await Promise.all([
              getDoc(doc(db, 'bosses', record.bossId)),
              record.weeklyPostId ? getDoc(doc(db, 'weekly_posts', record.weeklyPostId)) : null,
            ])
            return {
              record,
              boss: bossDoc.exists() ? ({ id: bossDoc.id, ...bossDoc.data() } as Boss) : null,
              weeklyPost: postDoc?.exists() ? ({ id: postDoc.id, ...postDoc.data() } as WeeklyPost) : null,
            }
          })
        )
        setRecords(rows)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [clientId, router])

  async function toggleRole() {
    if (!profile) return
    const newRole = profile.role === 'admin' ? 'client' : 'admin'
    setPromoting(true)
    try {
      await updateDoc(doc(db, 'profiles', profile.id), { role: newRole })
      setProfile({ ...profile, role: newRole })
      toast.success(newRole === 'admin' ? 'Promovido a administrador.' : 'Rol cambiado a cliente.')
    } catch {
      toast.error('Error al cambiar el rol.')
    } finally {
      setPromoting(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando...</p>
  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
        <div className="flex gap-2">
          {user?.uid !== profile.id && (
            <Button
              variant={profile.role === 'admin' ? 'destructive' : 'secondary'}
              size="sm"
              onClick={toggleRole}
              disabled={promoting}
            >
              {profile.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
            </Button>
          )}
          <Link
            href={`/admin/records/new?client=${profile.id}`}
            className={cn(buttonVariants())}
          >
            + Agregar Clear
          </Link>
          <Link href="/admin/clients" className={cn(buttonVariants({ variant: 'outline' }))}>
            ← Volver
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historial de Clears</span>
            <Badge variant="secondary">{records.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Sin clears registrados.{' '}
              <Link
                href={`/admin/records/new?client=${profile.id}`}
                className="text-primary hover:underline"
              >
                Agrega el primero.
              </Link>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Boss</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead>Fecha del Clear</TableHead>
                  <TableHead>Semana</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(({ record, boss, weeklyPost }) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{boss?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{boss?.difficulty ?? '—'}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(record.clearedAt)}</TableCell>
                    <TableCell>
                      {weeklyPost ? formatDate(weeklyPost.weekStart) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
