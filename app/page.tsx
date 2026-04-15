import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
      <div className="max-w-xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Boss Clear Service</h1>
        <p className="text-lg text-muted-foreground">
          Servicio de boss clears de MapleStory. Registra tu cuenta para ver tu historial
          de clears y los bosses completados cada semana.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className={cn(buttonVariants({ size: 'lg' }))}>
            Crear cuenta
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
