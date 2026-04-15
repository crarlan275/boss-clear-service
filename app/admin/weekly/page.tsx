import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { WeeklyPostForm } from './weekly-post-form'

export default async function WeeklyAdminPage() {
  const supabase = await createClient()

  const { data: bosses } = await supabase
    .from('bosses')
    .select('*')
    .eq('is_active', true)
    .order('difficulty')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publicar Bosses Semanales</h1>
          <p className="text-muted-foreground">
            Selecciona qué bosses completaste esta semana.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/weekly/history">Ver Historial</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">← Volver</Link>
          </Button>
        </div>
      </div>

      {bosses && bosses.length > 0 ? (
        <WeeklyPostForm bosses={bosses} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay bosses activos.{' '}
            <Link href="/admin/bosses" className="text-primary hover:underline">
              Agrega bosses primero.
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
