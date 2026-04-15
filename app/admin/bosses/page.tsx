import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { AddBossForm } from './add-boss-form'
import { ToggleBossButton } from './toggle-boss-button'

export default async function BossesPage() {
  const supabase = await createClient()
  const { data: bosses } = await supabase
    .from('bosses')
    .select('*')
    .order('difficulty')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Bosses</h1>
          <p className="text-muted-foreground">Administra los bosses disponibles en el servicio.</p>
        </div>
        <Link href="/admin" className={cn(buttonVariants({ variant: 'outline' }))}>
          ← Volver
        </Link>
      </div>

      <AddBossForm />

      <Card>
        <CardHeader>
          <CardTitle>Bosses ({bosses?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bosses?.map((boss) => (
              <div
                key={boss.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{boss.name}</span>
                  <Badge
                    variant={
                      boss.difficulty === 'Chaos'
                        ? 'destructive'
                        : boss.difficulty === 'Hard'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {boss.difficulty}
                  </Badge>
                  {!boss.is_active && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <ToggleBossButton id={boss.id} isActive={boss.is_active} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
