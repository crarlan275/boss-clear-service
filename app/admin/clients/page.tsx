import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const clients = profiles?.filter((p) => p.role === 'client') ?? []
  const admins = profiles?.filter((p) => p.role === 'admin') ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clients.length} clientes registrados.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">← Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No hay clientes registrados aún.
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{client.display_name}</p>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Registrado: {formatDate(client.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <Link href={`/admin/clients/${client.id}`}>Ver Clears</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/records/new?client=${client.id}`}>+ Clear</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {admins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Administradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{admin.display_name}</p>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                  </div>
                  <Badge>Admin</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
