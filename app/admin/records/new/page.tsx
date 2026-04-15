import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { AddRecordForm } from './add-record-form'

export default async function NewRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: preselectedClientId } = await searchParams
  const supabase = await createClient()

  const [{ data: clients }, { data: bosses }, { data: weeklyPosts }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').eq('role', 'client').order('display_name'),
    supabase.from('bosses').select('*').eq('is_active', true).order('difficulty').order('name'),
    supabase
      .from('weekly_posts')
      .select('id, week_start')
      .order('week_start', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agregar Clear</h1>
          <p className="text-muted-foreground">Registra un boss clear para un cliente.</p>
        </div>
        <Link href="/admin/clients" className={cn(buttonVariants({ variant: 'outline' }))}>
          ← Volver
        </Link>
      </div>

      <AddRecordForm
        clients={clients ?? []}
        bosses={bosses ?? []}
        weeklyPosts={weeklyPosts ?? []}
        preselectedClientId={preselectedClientId}
      />
    </div>
  )
}
