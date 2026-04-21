'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function AdminPage() {
  const [stats, setStats] = useState({ clients: 0, records: 0, bosses: 0, lastWeek: '' })

  useEffect(() => {
    async function load() {
      const [clientsSnap, recordsSnap, bossesSnap, weekSnap] = await Promise.all([
        getDocs(query(collection(db, 'profiles'), where('role', '==', 'client'))),
        getDocs(collection(db, 'client_records')),
        getDocs(query(collection(db, 'bosses'), where('isActive', '==', true))),
        getDocs(query(collection(db, 'weekly_posts'), orderBy('weekStart', 'desc'), limit(1))),
      ])
      const lastWeekDate = weekSnap.empty ? '' : (weekSnap.docs[0].data().weekStart as string)
      const formatted = lastWeekDate
        ? new Date(lastWeekDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
        : 'Sin posts'
      setStats({ clients: clientsSnap.size, records: recordsSnap.size, bosses: bossesSnap.size, lastWeek: formatted })
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground">Gestiona clears, bosses y clientes.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Clientes', value: stats.clients },
          { label: 'Clears Totales', value: stats.records },
          { label: 'Bosses Activos', value: stats.bosses },
          { label: 'Última Semana', value: stats.lastWeek },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Bosses Semanales</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Publica qué bosses completaste esta semana.</p>
            <Link href="/admin/weekly" className={cn(buttonVariants(), 'w-full')}>Publicar Semana</Link>
            <Link href="/admin/weekly/history" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>Ver Historial</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Clientes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Gestiona clientes y sus registros de clears.</p>
            <Link href="/admin/clients" className={cn(buttonVariants(), 'w-full')}>Ver Clientes</Link>
            <Link href="/admin/records/new" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>Agregar Clear</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Catálogo de Bosses</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Agrega o edita los bosses disponibles.</p>
            <Link href="/admin/bosses" className={cn(buttonVariants(), 'w-full')}>Gestionar Bosses</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Precios</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Establece el precio por boss clear que ven los clientes.</p>
            <Link href="/admin/prices" className={cn(buttonVariants(), 'w-full')}>Gestionar Precios</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Personajes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Administra personajes registrados y activa el blink.</p>
            <Link href="/admin/characters" className={cn(buttonVariants(), 'w-full')}>Ver Personajes</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pilotos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Aprueba solicitudes, gestiona pilotos y revisa actividad semanal.</p>
            <Link href="/admin/pilots" className={cn(buttonVariants(), 'w-full')}>Gestionar Pilotos</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
