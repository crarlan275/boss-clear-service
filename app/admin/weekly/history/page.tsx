import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function WeeklyHistoryPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('weekly_posts')
    .select('*, weekly_post_bosses(boss_id, bosses(name, difficulty))')
    .order('week_start', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial Semanal</h1>
          <p className="text-muted-foreground">Todos los posts semanales publicados.</p>
        </div>
        <Link href="/admin/weekly" className={cn(buttonVariants({ variant: 'outline' }))}>
          ← Volver
        </Link>
      </div>

      {posts?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay posts publicados aún.
          </CardContent>
        </Card>
      )}

      {posts?.map((post) => {
        const bossEntries = post.weekly_post_bosses as Array<{
          boss_id: string
          bosses: { name: string; difficulty: string }
        }>
        return (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Semana del {formatDate(post.week_start)}</span>
                <Badge variant="secondary">{bossEntries.length} bosses</Badge>
              </CardTitle>
              {post.notes && <p className="text-sm text-muted-foreground">{post.notes}</p>}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {bossEntries.map((entry) => (
                  <Badge
                    key={entry.boss_id}
                    variant={
                      entry.bosses.difficulty === 'Chaos'
                        ? 'destructive'
                        : entry.bosses.difficulty === 'Hard'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {entry.bosses.name} ({entry.bosses.difficulty})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
