import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
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
          <Link href="/admin/weekly/history" className={cn(buttonVariants({ variant: 'outline' }))}>
            Ver Historial
          </Link>
          <Link href="/admin" className={cn(buttonVariants({ variant: 'outline' }))}>
            ← Volver
          </Link>
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
