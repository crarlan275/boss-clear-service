'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { WeeklyPost, Boss } from '@/lib/types'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface PostWithBosses {
  post: WeeklyPost
  bosses: Boss[]
}

export default function WeeklyHistoryPage() {
  const [data, setData] = useState<PostWithBosses[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      const q = query(collection(db, 'weekly_posts'), orderBy('weekStart', 'desc'))
      const snap = await getDocs(q)
      const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WeeklyPost))

      const result: PostWithBosses[] = await Promise.all(
        posts.map(async (post) => {
          const bosses = await Promise.all(
            (post.bossIds ?? []).map(async (bossId) => {
              const bossDoc = await getDoc(doc(db, 'bosses', bossId))
              return bossDoc.exists() ? ({ id: bossDoc.id, ...bossDoc.data() } as Boss) : null
            })
          )
          return { post, bosses: bosses.filter(Boolean) as Boss[] }
        })
      )
      setData(result)
      setLoading(false)
    }
    fetchHistory()
  }, [])

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

      {loading && <p className="text-muted-foreground">Cargando historial...</p>}

      {!loading && data.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay posts publicados aún.
          </CardContent>
        </Card>
      )}

      {data.map(({ post, bosses }) => (
        <Card key={post.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Semana del {formatDate(post.weekStart)}</span>
              <Badge variant="secondary">{bosses.length} bosses</Badge>
            </CardTitle>
            {post.notes && <p className="text-sm text-muted-foreground">{post.notes}</p>}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bosses.map((boss) => (
                <Badge
                  key={boss.id}
                  variant={
                    boss.difficulty === 'Chaos'
                      ? 'destructive'
                      : boss.difficulty === 'Hard'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {boss.name} ({boss.difficulty})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
