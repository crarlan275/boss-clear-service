'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ToggleBossButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()

  async function toggle() {
    const supabase = createClient()
    const { error } = await supabase
      .from('bosses')
      .update({ is_active: !isActive })
      .eq('id', id)

    if (error) {
      toast.error('Error al actualizar boss.')
    } else {
      router.refresh()
    }
  }

  return (
    <Button variant={isActive ? 'outline' : 'secondary'} size="sm" onClick={toggle}>
      {isActive ? 'Desactivar' : 'Activar'}
    </Button>
  )
}
