import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ClientRecordWithDetails } from '@/lib/types'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: records } = await supabase
    .from('client_records')
    .select('*, bosses(*), weekly_posts(*)')
    .eq('client_id', user.id)
    .order('cleared_at', { ascending: false })

  const typedRecords = (records ?? []) as ClientRecordWithDetails[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {profile?.display_name ?? 'Jugador'} 👋
        </h1>
        <p className="text-muted-foreground">Aquí está tu historial de boss clears.</p>
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
              Aún no tienes clears registrados.
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
                      {record.weekly_posts
                        ? formatDate(record.weekly_posts.week_start)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.notes ?? '—'}
                    </TableCell>
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
