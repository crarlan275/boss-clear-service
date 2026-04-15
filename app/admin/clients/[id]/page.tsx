import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { ClientRecordWithDetails } from '@/lib/types'
import { PromoteButton } from './promote-button'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: records } = await supabase
    .from('client_records')
    .select('*, bosses(*), weekly_posts(*)')
    .eq('client_id', id)
    .order('cleared_at', { ascending: false })

  const typedRecords = (records ?? []) as ClientRecordWithDetails[]

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
        <div className="flex gap-2">
          {user?.id !== profile.id && (
            <PromoteButton profileId={profile.id} currentRole={profile.role} />
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
            <Badge variant="secondary">{typedRecords.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typedRecords.length === 0 ? (
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
                {typedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.bosses.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.bosses.difficulty}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(record.cleared_at)}</TableCell>
                    <TableCell>
                      {record.weekly_posts ? formatDate(record.weekly_posts.week_start) : '—'}
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
