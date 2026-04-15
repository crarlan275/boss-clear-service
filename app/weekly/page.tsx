import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function WeeklyPage() {
  const supabase = await createClient()

  const { data: latestPost } = await supabase
    .from('weekly_posts')
    .select('*, weekly_post_bosses(boss_id, bosses(*))')
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  if (!latestPost) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Bosses de esta semana</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            El administrador aún no ha publicado los bosses de esta semana.
          </CardContent>
        </Card>
      </div>
    )
  }

  const bossEntries = latestPost.weekly_post_bosses as Array<{
    boss_id: string
    bosses: { id: string; name: string; difficulty: string }
  }>

  // Group by difficulty
  const grouped: Record<string, typeof bossEntries> = {}
  for (const entry of bossEntries) {
    const diff = entry.bosses.difficulty
    if (!grouped[diff]) grouped[diff] = []
    grouped[diff].push(entry)
  }

  const difficultyOrder = ['Chaos', 'Hard', 'Normal']
  const sortedDifficulties = Object.keys(grouped).sort(
    (a, b) => difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bosses de esta semana</h1>
        <p className="text-muted-foreground">
          Semana del {formatDate(latestPost.week_start)}
        </p>
        {latestPost.notes && (
          <p className="mt-2 text-sm bg-muted px-3 py-2 rounded-md">{latestPost.notes}</p>
        )}
      </div>

      {sortedDifficulties.map((difficulty) => (
        <div key={difficulty}>
          <h2 className="text-lg font-semibold mb-3">{difficulty}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {grouped[difficulty].map((entry) => (
              <Card key={entry.boss_id} className="text-center">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base">{entry.bosses.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <Badge
                    variant={
                      difficulty === 'Chaos'
                        ? 'destructive'
                        : difficulty === 'Hard'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {difficulty}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        Total: {bossEntries.length} boss{bossEntries.length !== 1 ? 'es' : ''} esta semana
      </p>
    </div>
  )
}
