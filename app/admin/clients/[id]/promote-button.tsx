'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Role } from '@/lib/types'

export function PromoteButton({
  profileId,
  currentRole,
}: {
  profileId: string
  currentRole: Role
}) {
  const router = useRouter()
  const isAdmin = currentRole === 'admin'

  async function toggle() {
    const newRole: Role = isAdmin ? 'client' : 'admin'
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)

    if (error) {
      toast.error('Error al cambiar el rol.')
    } else {
      toast.success(isAdmin ? 'Rol cambiado a cliente.' : 'Promovido a administrador.')
      router.refresh()
    }
  }

  return (
    <Button variant={isAdmin ? 'destructive' : 'secondary'} size="sm" onClick={toggle}>
      {isAdmin ? 'Quitar Admin' : 'Hacer Admin'}
    </Button>
  )
}
