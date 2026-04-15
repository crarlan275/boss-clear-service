import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AdminPage() {
  const supabase = await createClient()

  const [{ count: clientCount }, { count: recordCount }, { count: bossCount }] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('client_records').select('*', { count: 'exact', head: true }),
      supabase.from('bosses').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])

  const { data: latestPost } = await supabase
    .from('weekly_posts')
    .select('week_start')
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground">Gestiona clears, bosses y clientes.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{clientCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clears Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{recordCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bosses Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{bossCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Última Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {latestPost
                ? new Date(latestPost.week_start + 'T00:00:00').toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Sin posts'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bosses Semanales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Publica qué bosses completaste esta semana.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/weekly">Publicar Semana</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/weekly/history">Ver Historial</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Gestiona clientes y sus registros de clears.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/clients">Ver Clientes</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/records/new">Agregar Clear</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Bosses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Agrega o edita los bosses disponibles en el servicio.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/bosses">Gestionar Bosses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
