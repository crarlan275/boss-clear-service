'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, updateDoc, doc, deleteField, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { diffStyle } from '@/lib/difficulty'
import type { Profile, Boss, MapleCharacter, ClientRecord } from '@/lib/types'

// Monday of current week
function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface PilotApplication {
  id: string
  userId: string
  displayName: string
  email: string
  motivation: string
  experience: string | null
  discord: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

interface CharWithBosses extends MapleCharacter {
  selectedBosses: Boss[]
}
interface ClientWithChars extends Profile {
  characters: CharWithBosses[]
}
interface PilotWithClients extends Profile {
  clients: ClientWithChars[]
}

export default function PilotsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [applications, setApplications] = useState<PilotApplication[]>([])
  const [bossMap, setBossMap] = useState<Record<string, Boss>>({})
  const [allChars, setAllChars] = useState<MapleCharacter[]>([])
  const [weekRecords, setWeekRecords] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [expandedPilot, setExpandedPilot] = useState<string | null>(null)
  const [pendingAssign, setPendingAssign] = useState<Record<string, string>>({})
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [profilesSnap, appsSnap, bossesSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(query(collection(db, 'pilot_applications'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'bosses'), where('isActive', '==', true))),
      ])

      const loadedProfiles = profilesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Profile))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
      setProfiles(loadedProfiles)
      setApplications(appsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PilotApplication)))

      const bm: Record<string, Boss> = {}
      bossesSnap.docs.forEach((d) => { bm[d.id] = { id: d.id, ...d.data() } as Boss })
      setBossMap(bm)

      // Load chars for all clients
      const clientIds = loadedProfiles.filter((p) => p.role === 'client').map((p) => p.id)
      const chars: MapleCharacter[] = []
      for (let i = 0; i < clientIds.length; i += 30) {
        const chunk = clientIds.slice(i, i + 30)
        if (chunk.length === 0) continue
        const snap = await getDocs(query(collection(db, 'maple_characters'), where('ownerId', 'in', chunk)))
        snap.docs.forEach((d) => chars.push({ id: d.id, ...d.data() } as MapleCharacter))
      }
      setAllChars(chars)

      // Load this week's records
      const weekStart = getWeekStart()
      const recSnap = await getDocs(
        query(collection(db, 'client_records'), where('clearedAt', '>=', weekStart))
      )
      setWeekRecords(recSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientRecord)))
    } catch (err) {
      console.error(err)
      toast.error('Error cargando datos.')
    } finally {
      setLoading(false)
    }
  }

  // Un perfil es piloto si role === 'pilot' O si isPilot === true (admin con permisos de piloto)
  const isPilotProfile = (p: Profile) => p.role === 'pilot' || p.isPilot === true
  const pilots = profiles.filter(isPilotProfile)
  const clients = profiles.filter((p) => p.role === 'client')
  const unassigned = clients.filter((c) => !c.pilotId)
  // Promotable: clientes y admins que aún NO son pilotos
  const promotable = profiles.filter((p) => !isPilotProfile(p))
  const pendingApps = applications.filter((a) => a.status === 'pending')

  function clientsOf(pilotId: string) {
    return clients.filter((c) => c.pilotId === pilotId)
  }

  function buildPilotWithClients(pilot: Profile): PilotWithClients {
    const pilotClients = clientsOf(pilot.id).map((client) => {
      const chars = allChars
        .filter((c) => c.ownerId === client.id)
        .map((c) => ({
          ...c,
          selectedBosses: c.selectedBossIds.map((id) => bossMap[id]).filter(Boolean),
        }))
      return { ...client, characters: chars }
    })
    return { ...pilot, clients: pilotClients }
  }

  function getClearedThisWeek(clientId: string, bossId: string) {
    return weekRecords.find((r) => r.clientId === clientId && r.bossId === bossId) ?? null
  }

  async function approveApplication(app: PilotApplication) {
    setWorking(app.id)
    try {
      const currentProfile = profiles.find((p) => p.id === app.userId)
      // Si es admin, solo marcamos isPilot; si es cliente, cambiamos el role a 'pilot'
      const isAdmin = currentProfile?.role === 'admin'
      const updates = isAdmin ? { isPilot: true } : { role: 'pilot' as const, isPilot: true }
      await updateDoc(doc(db, 'pilot_applications', app.id), { status: 'approved' })
      await updateDoc(doc(db, 'profiles', app.userId), updates)
      setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: 'approved' } : a))
      setProfiles((prev) => prev.map((p) => p.id === app.userId ? { ...p, ...updates } : p))
      toast.success(`${app.displayName} aprobado como piloto.`)
    } catch {
      toast.error('Error aprobando la solicitud.')
    } finally {
      setWorking(null)
    }
  }

  async function rejectApplication(app: PilotApplication) {
    setWorking(app.id)
    try {
      await updateDoc(doc(db, 'pilot_applications', app.id), { status: 'rejected' })
      setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: 'rejected' } : a))
      toast.success(`Solicitud de ${app.displayName} rechazada.`)
    } catch {
      toast.error('Error rechazando la solicitud.')
    } finally {
      setWorking(null)
    }
  }

  async function promoteToPilot(profile: Profile) {
    if (!confirm(`¿Hacer piloto a ${profile.displayName}?`)) return
    setWorking(profile.id)
    try {
      // Admin: conserva role: 'admin', solo agrega isPilot: true
      // Cliente: cambia role a 'pilot' y agrega isPilot: true
      const isAdmin = profile.role === 'admin'
      const updates = isAdmin
        ? { isPilot: true }
        : { role: 'pilot' as const, isPilot: true }
      await updateDoc(doc(db, 'profiles', profile.id), updates)
      setProfiles((prev) => prev.map((p) =>
        p.id === profile.id ? { ...p, ...updates } : p
      ))
      toast.success(`${profile.displayName} ahora es piloto.${isAdmin ? ' Conserva su rol de admin.' : ''}`)
    } catch {
      toast.error('Error actualizando rol.')
    } finally {
      setWorking(null)
    }
  }

  async function demotePilot(pilot: Profile) {
    const assigned = clientsOf(pilot.id)
    if (assigned.length > 0) {
      toast.error(`Desasigna los ${assigned.length} clientes de ${pilot.displayName} primero.`)
      return
    }
    // Si es admin-piloto, solo quitamos isPilot; si era cliente, volvemos a role: 'client'
    const isAdmin = pilot.role === 'admin'
    const roleName = isAdmin ? 'solo administrador' : 'cliente'
    if (!confirm(`¿Quitar el rol de piloto a ${pilot.displayName}? Quedará como ${roleName}.`)) return
    setWorking(pilot.id)
    try {
      const updates = isAdmin
        ? { isPilot: deleteField() }
        : { role: 'client' as const, isPilot: deleteField() }
      await updateDoc(doc(db, 'profiles', pilot.id), updates)
      setProfiles((prev) => prev.map((p) =>
        p.id === pilot.id ? { ...p, role: isAdmin ? p.role : 'client', isPilot: undefined } : p
      ))
      toast.success(`${pilot.displayName} ya no es piloto.`)
    } catch {
      toast.error('Error actualizando rol.')
    } finally {
      setWorking(null)
    }
  }

  async function assignClient(clientId: string, pilotId: string) {
    const client = profiles.find((p) => p.id === clientId)
    const pilot = profiles.find((p) => p.id === pilotId)
    if (!client || !pilot) return
    setWorking(clientId)
    try {
      await updateDoc(doc(db, 'profiles', clientId), { pilotId })
      setProfiles((prev) => prev.map((p) => p.id === clientId ? { ...p, pilotId } : p))
      setPendingAssign((prev) => { const next = { ...prev }; delete next[pilotId]; delete next[`u_${clientId}`]; return next })
      toast.success(`${client.displayName} asignado a ${pilot.displayName}.`)
    } catch {
      toast.error('Error asignando cliente.')
    } finally {
      setWorking(null)
    }
  }

  async function unassignClient(client: Profile) {
    setWorking(client.id)
    try {
      await updateDoc(doc(db, 'profiles', client.id), { pilotId: deleteField() })
      setProfiles((prev) => prev.map((p) => p.id === client.id ? { ...p, pilotId: undefined } : p))
      toast.success(`${client.displayName} desasignado.`)
    } catch {
      toast.error('Error desasignando cliente.')
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-amber-400/15 bg-card/60 p-6 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 120% at 100% 50%, rgba(180,140,30,0.09) 0%, transparent 70%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-400/70 mb-1">Admin</p>
          <h1 className="font-cinzel text-2xl font-bold">Pilotos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona pilotos, solicitudes y actividad de clears.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          <span className="text-sm">Cargando...</span>
        </div>
      ) : (
        <>
          {/* ── Solicitudes pendientes ──────────────────── */}
          {pendingApps.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-950/5 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-amber-500/20 pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="font-cinzel text-base tracking-widest uppercase text-amber-400">Solicitudes Pendientes</span>
                  <Badge className="border-amber-500/40 text-amber-400 bg-amber-500/10">{pendingApps.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {pendingApps.map((app) => (
                    <div key={app.id}>
                      <button
                        onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-amber-400/[0.03] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel font-bold text-foreground">{app.displayName}</span>
                            <Badge variant="secondary" className="text-[10px]">Pendiente</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                          {app.discord && (
                            <p className="text-xs text-muted-foreground/60">Discord: {app.discord}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(app.createdAt).toLocaleDateString('es-ES')}
                        </p>
                        <span className="text-muted-foreground/40 ml-2">{expandedApp === app.id ? '▲' : '▼'}</span>
                      </button>
                      {expandedApp === app.id && (
                        <div className="border-t border-border/20 bg-background/20 px-4 py-4 space-y-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Motivación</p>
                            <p className="text-sm text-foreground">{app.motivation}</p>
                          </div>
                          {app.experience && (
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Experiencia</p>
                              <p className="text-sm text-foreground">{app.experience}</p>
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => approveApplication(app)}
                              disabled={working === app.id}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                            >
                              {working === app.id ? '...' : '✓ Aprobar y hacer Piloto'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectApplication(app)}
                              disabled={working === app.id}
                              className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs"
                            >
                              ✕ Rechazar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Actividad de pilotos esta semana ────────── */}
          {pilots.length > 0 && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="font-cinzel text-base tracking-widest uppercase">Actividad Esta Semana</span>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="text-emerald-400">✓ {weekRecords.length} completadas</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {pilots.map((pilot) => {
                    const pilotData = buildPilotWithClients(pilot)
                    const isExpanded = expandedPilot === pilot.id

                    // Count pending and done for this pilot's clients
                    let pilotPending = 0
                    let pilotDone = 0
                    for (const client of pilotData.clients) {
                      for (const char of client.characters) {
                        for (const boss of char.selectedBosses) {
                          if (getClearedThisWeek(client.id, boss.id)) pilotDone++
                          else pilotPending++
                        }
                      }
                    }

                    return (
                      <div key={pilot.id}>
                        <button
                          onClick={() => setExpandedPilot(isExpanded ? null : pilot.id)}
                          className="w-full flex items-center gap-4 p-4 text-left hover:bg-amber-400/[0.02] transition-colors"
                        >
                          {pilot.avatarUrl ? (
                            <img src={pilot.avatarUrl} alt={pilot.displayName}
                              className="h-9 w-9 rounded-full border border-violet-500/30 flex-shrink-0 object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-full border border-violet-500/30 bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-violet-400">{pilot.displayName.slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-cinzel font-bold text-foreground">{pilot.displayName}</span>
                              <Badge className="border-violet-500/40 text-violet-400 bg-violet-500/10 text-[10px]">Piloto</Badge>
                              {pilot.role === 'admin' && (
                                <Badge className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]">Admin</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{pilotData.clients.length} clientes</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 text-xs font-semibold">
                            <span className="text-emerald-400">✓ {pilotDone}</span>
                            <span className="text-amber-400">○ {pilotPending}</span>
                            <span className="text-muted-foreground/40 ml-1">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border/20 bg-background/10 divide-y divide-border/20">
                            {pilotData.clients.length === 0 ? (
                              <p className="text-sm text-muted-foreground/60 text-center py-6">Sin clientes asignados.</p>
                            ) : (
                              pilotData.clients.map((client) => (
                                <div key={client.id} className="px-6 py-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    {client.avatarUrl && (
                                      <img src={client.avatarUrl} alt={client.displayName}
                                        className="h-6 w-6 rounded-full object-cover" />
                                    )}
                                    <span className="font-semibold text-sm text-foreground">{client.displayName}</span>
                                  </div>
                                  {client.characters.map((char) => (
                                    <div key={char.id} className="ml-4 mb-3">
                                      <p className="text-xs text-muted-foreground mb-1.5 font-semibold">{char.name} — {char.class}</p>
                                      <div className="flex flex-wrap gap-2">
                                        {char.selectedBosses.map((boss) => {
                                          const rec = getClearedThisWeek(client.id, boss.id)
                                          return (
                                            <div key={boss.id} className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
                                              rec ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400' : 'border-border/40 text-muted-foreground'
                                            }`}>
                                              {rec ? '✓' : '○'}
                                              <span className={diffStyle(boss.difficulty).split(' ')[2]}>{boss.name}</span>
                                              <span className="text-[10px] opacity-60">{boss.difficulty}</span>
                                              {rec?.imageUrls && rec.imageUrls.length > 0 && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setExpandedImage(expandedImage === rec.imageUrls![0] ? null : rec.imageUrls![0]) }}
                                                  className="ml-1 text-amber-400 hover:text-amber-300 transition-colors"
                                                >
                                                  📷
                                                </button>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Pilotos activos: gestión de clientes ────── */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="font-cinzel text-base tracking-widest uppercase">Asignación de Clientes</span>
                <Badge variant="secondary" className="border-border/50 bg-secondary/80 font-semibold">{pilots.length} pilotos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pilots.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No hay pilotos designados aún.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {pilots.map((pilot) => {
                    const pilotClients = clientsOf(pilot.id)
                    const isExp = expandedPilot === `assign_${pilot.id}`
                    const availableToAssign = unassigned

                    return (
                      <div key={`assign_${pilot.id}`} className="p-4">
                        <div className="flex items-center gap-3">
                          {pilot.avatarUrl ? (
                            <img src={pilot.avatarUrl} alt={pilot.displayName}
                              className="h-9 w-9 rounded-full border border-violet-500/30 flex-shrink-0 object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-full border border-violet-500/30 bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-violet-400">{pilot.displayName.slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-cinzel font-bold text-foreground">{pilot.displayName}</span>
                            <p className="text-xs text-muted-foreground truncate">{pilot.email}</p>
                          </div>
                          <button
                            onClick={() => setExpandedPilot(isExp ? null : `assign_${pilot.id}`)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mr-2"
                          >
                            {pilotClients.length} cliente{pilotClients.length !== 1 ? 's' : ''}
                            <span className="ml-1">{isExp ? '▲' : '▼'}</span>
                          </button>
                          <button
                            onClick={() => demotePilot(pilot)}
                            disabled={working === pilot.id}
                            title={`Quitar permisos de piloto${pilot.role === 'admin' ? ' (conserva admin)' : ''}`}
                            className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50 flex-shrink-0"
                          >
                            {working === pilot.id ? '...' : 'Quitar rol'}
                          </button>
                        </div>

                        {isExp && (
                          <div className="mt-4 ml-12 space-y-3">
                            {pilotClients.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">Clientes asignados</p>
                                {pilotClients.map((client) => (
                                  <div key={client.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      {client.avatarUrl && (
                                        <img src={client.avatarUrl} alt={client.displayName}
                                          className="h-6 w-6 rounded-full object-cover" />
                                      )}
                                      <span className="text-sm font-medium text-foreground">{client.displayName}</span>
                                      <span className="text-xs text-muted-foreground">{client.email}</span>
                                    </div>
                                    <button
                                      onClick={() => unassignClient(client)}
                                      disabled={working === client.id}
                                      className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                    >
                                      {working === client.id ? '...' : 'Desasignar'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {availableToAssign.length > 0 && (
                              <div className="flex items-center gap-2 pt-1">
                                <select
                                  className="flex-1 rounded border border-border/60 bg-input/80 px-3 py-1.5 text-sm text-foreground focus:border-amber-400/50 focus:outline-none"
                                  value={pendingAssign[pilot.id] ?? ''}
                                  onChange={(e) => setPendingAssign((prev) => ({ ...prev, [pilot.id]: e.target.value }))}
                                >
                                  <option value="">Seleccionar cliente sin asignar...</option>
                                  {availableToAssign.map((c) => (
                                    <option key={c.id} value={c.id}>{c.displayName} · {c.email}</option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  disabled={!pendingAssign[pilot.id] || !!working}
                                  onClick={() => { const id = pendingAssign[pilot.id]; if (id) assignClient(id, pilot.id) }}
                                  className="bg-amber-400 text-background hover:bg-amber-300 font-semibold text-xs"
                                >
                                  Asignar
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Promover a piloto ───────────────────────── */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="font-cinzel text-base tracking-widest uppercase">Promover a Piloto</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {promotable.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No hay usuarios disponibles.</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {promotable.map((profile) => (
                    <div key={profile.id} className="flex items-center gap-3 p-4">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.displayName}
                          className="h-8 w-8 rounded-full border border-border/40 flex-shrink-0 object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full border border-border/40 bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-muted-foreground">{profile.displayName.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{profile.displayName}</span>
                          <Badge variant="secondary" className="text-[10px] capitalize">{profile.role}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={working === profile.id}
                        onClick={() => promoteToPilot(profile)}
                        className="border-violet-500/40 text-violet-400 hover:bg-violet-500/10 text-xs flex-shrink-0"
                      >
                        {working === profile.id
                          ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          : '⚡ Hacer Piloto'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solicitudes históricas */}
          {applications.filter((a) => a.status !== 'pending').length > 0 && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="font-cinzel text-base tracking-widest uppercase text-muted-foreground">Historial de Solicitudes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {applications.filter((a) => a.status !== 'pending').map((app) => (
                    <div key={app.id} className="flex items-center gap-3 p-4">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">{app.displayName}</span>
                        <p className="text-xs text-muted-foreground">{app.email}</p>
                      </div>
                      <Badge className={
                        app.status === 'approved'
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : 'border-destructive/40 text-destructive bg-destructive/10'
                      }>
                        {app.status === 'approved' ? '✓ Aprobado' : '✕ Rechazado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Image lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Clear screenshot"
            className="max-h-[80vh] max-w-[90vw] rounded-xl border border-border/40 object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 rounded-full border border-border/60 bg-background/80 p-2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
