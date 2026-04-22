'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collection, getDocs, query, where, addDoc, doc, updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { diffStyle } from '@/lib/difficulty'
import type { Profile, MapleCharacter, Boss, ClientRecord } from '@/lib/types'

// Monday of the current week
function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

interface CharWithBosses extends MapleCharacter {
  selectedBosses: Boss[]
}
interface PilotClient extends Profile {
  characters: CharWithBosses[]
}

interface ClearForm {
  clientId: string
  charId: string
  bossId: string
  charName: string
  bossName: string
}

export default function PilotPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState<PilotClient[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [clearedKeys, setClearedKeys] = useState<Set<string>>(new Set())
  const [weekRecords, setWeekRecords] = useState<Record<string, ClientRecord>>({})

  const [lockingCharIds, setLockingCharIds] = useState<Set<string>>(new Set())
  const [clearForm, setClearForm] = useState<ClearForm | null>(null)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formNotes, setFormNotes] = useState('')
  const [formImageFile, setFormImageFile] = useState<File | null>(null)
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── auto-cleanup: borrar imágenes >14 días de Cloudinary y Firestore ───────
  async function cleanupOldImages(records: ClientRecord[]) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 14)
    const cutoffISO = cutoff.toISOString()

    const stale = records.filter(
      (r) => r.imagePath && r.imageUploadedAt && r.imageUploadedAt < cutoffISO
    )
    if (stale.length === 0) return

    const idToken = await auth.currentUser?.getIdToken()

    await Promise.allSettled(
      stale.map(async (r) => {
        // 1. Borrar de Cloudinary
        try {
          await fetch('/api/upload', {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ publicId: r.imagePath }),
          })
        } catch {
          // ignorar errores de borrado — puede que ya no exista
        }
        // 2. Limpiar en Firestore
        await updateDoc(doc(db, 'client_records', r.id), {
          imageUrls: [],
          imagePath: null,
          imageUploadedAt: null,
        })
      })
    )
  }

  // ── lock / unlock boss selection for a character ───────────────────────────
  async function toggleLock(charId: string, currentLocked: boolean) {
    setLockingCharIds((prev) => new Set([...prev, charId]))
    try {
      await updateDoc(doc(db, 'maple_characters', charId), { bossesLocked: !currentLocked })
      // Optimistic update: reflect in local state
      setClients((prev) =>
        prev.map((client) => ({
          ...client,
          characters: client.characters.map((c) =>
            c.id === charId ? { ...c, bossesLocked: !currentLocked } : c
          ),
        }))
      )
      toast.success(!currentLocked ? '🔒 Bosses bloqueados.' : '🔓 Bosses desbloqueados.')
    } catch (err) {
      console.error(err)
      toast.error('Error al cambiar el bloqueo.')
    } finally {
      setLockingCharIds((prev) => { const next = new Set(prev); next.delete(charId); return next })
    }
  }

  const load = useCallback(async () => {
    if (!user) return
    try {
      const clientsSnap = await getDocs(
        query(collection(db, 'profiles'), where('pilotId', '==', user.uid))
      )
      const clientProfiles = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile))
      if (clientProfiles.length === 0) { setLoading(false); return }

      const clientIds = clientProfiles.map((c) => c.id)

      const bossesSnap = await getDocs(query(collection(db, 'bosses'), where('isActive', '==', true)))
      const bossMap: Record<string, Boss> = {}
      bossesSnap.docs.forEach((d) => { bossMap[d.id] = { id: d.id, ...d.data() } as Boss })

      const allChars: MapleCharacter[] = []
      for (let i = 0; i < clientIds.length; i += 30) {
        const chunk = clientIds.slice(i, i + 30)
        const snap = await getDocs(query(collection(db, 'maple_characters'), where('ownerId', 'in', chunk)))
        snap.docs.forEach((d) => allChars.push({ id: d.id, ...d.data() } as MapleCharacter))
      }

      // Cargar todos los records de estos clientes
      const weekStart = getWeekStart()
      const newClearedKeys = new Set<string>()
      const newWeekRecords: Record<string, ClientRecord> = {}
      const clientIdSet = new Set(clientIds)
      const allRecords: ClientRecord[] = []

      for (let i = 0; i < clientIds.length; i += 30) {
        const chunk = clientIds.slice(i, i + 30)
        const snap = await getDocs(
          query(collection(db, 'client_records'), where('clientId', 'in', chunk))
        )
        snap.docs.forEach((d) => {
          const r = { id: d.id, ...d.data() } as ClientRecord
          allRecords.push(r)
          // Solo indexamos records con charId — sin él no podemos atribuirlo a un personaje específico
          if (r.clearedAt >= weekStart && clientIdSet.has(r.clientId) && r.charId) {
            const key = `${r.clientId}:${r.charId}:${r.bossId}`
            newClearedKeys.add(key)
            newWeekRecords[key] = r
          }
        })
      }

      setClearedKeys(newClearedKeys)
      setWeekRecords(newWeekRecords)

      // Limpiar imágenes viejas en background (sin bloquear la UI)
      cleanupOldImages(allRecords).catch(console.error)

      const pilotClients: PilotClient[] = clientProfiles.map((profile) => ({
        ...profile,
        characters: allChars
          .filter((c) => c.ownerId === profile.id)
          .map((c) => ({
            ...c,
            selectedBosses: c.selectedBossIds.map((id) => bossMap[id]).filter(Boolean),
          })),
      }))
      setClients(pilotClients)
    } catch (err) {
      console.error(err)
      toast.error('Error cargando datos.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // ── imagen helpers ──────────────────────────────────────────────────────────
  function applyImageFile(file: File) {
    if (formImagePreview) URL.revokeObjectURL(formImagePreview)
    setFormImageFile(file)
    setFormImagePreview(URL.createObjectURL(file))
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { applyImageFile(file); e.preventDefault(); return }
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) applyImageFile(file)
    e.target.value = ''
  }

  function clearImage() {
    if (formImagePreview) URL.revokeObjectURL(formImagePreview)
    setFormImageFile(null)
    setFormImagePreview(null)
  }

  // ── form open/close ─────────────────────────────────────────────────────────
  function openForm(clientId: string, charId: string, bossId: string, charName: string, bossName: string) {
    setClearForm({ clientId, charId, bossId, charName, bossName })
    setFormDate(new Date().toISOString().split('T')[0])
    setFormNotes('')
    clearImage()
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function submitClear() {
    if (!clearForm || !user) return
    setSubmitting(true)
    try {
      let imageUrls: string[] = []
      let imagePath: string | null = null
      let imageUploadedAt: string | null = null

      // Obtener token una sola vez — se usa tanto para upload como para notificación
      const idToken = await auth.currentUser?.getIdToken()

      if (formImageFile) {
        const fd = new FormData()
        fd.append('file', formImageFile)
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
          body: fd,
        })
        if (!uploadRes.ok) throw new Error('Error subiendo imagen')
        const { url, publicId } = await uploadRes.json()
        imageUrls = [url]
        imagePath = publicId       // Cloudinary public_id para referencia
        imageUploadedAt = new Date().toISOString()
      }

      const record = {
        clientId: clearForm.clientId,
        charId: clearForm.charId,
        bossId: clearForm.bossId,
        weeklyPostId: null,
        clearedAt: formDate,
        notes: formNotes || null,
        imageUrls,
        imagePath,
        imageUploadedAt,
        addedBy: user.uid,
        createdAt: new Date().toISOString(),
      }
      const ref = await addDoc(collection(db, 'client_records'), record)
      const key = `${clearForm.clientId}:${clearForm.charId}:${clearForm.bossId}`
      const newClearedKeys = new Set([...clearedKeys, key])
      setClearedKeys(newClearedKeys)
      setWeekRecords((prev) => ({ ...prev, [key]: { id: ref.id, ...record } as ClientRecord }))
      toast.success(`${clearForm.bossName} marcado como completado.`)

      // Verificar si todos los bosses del personaje quedaron completados esta semana
      const client = clients.find(c => c.id === clearForm.clientId)
      const char = client?.characters.find(ch => ch.id === clearForm.charId)
      const difficulty = char?.selectedBosses.find(b => b.id === clearForm.bossId)?.difficulty ?? ''
      const weeklyComplete = char?.selectedBosses.length
        ? char.selectedBosses.every(b => newClearedKeys.has(`${clearForm.clientId}:${clearForm.charId}:${b.id}`))
        : false

      setClearForm(null)
      clearImage()

      // Enviar notificación Discord en background (no bloqueamos si falla)
      fetch('/api/notify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clearForm.clientId,
          bossName: clearForm.bossName,
          difficulty,
          characterName: clearForm.charName,
          clearedAt: formDate,
          notes: formNotes || null,
          imageUrl: imageUrls[0] ?? null,
          weeklyComplete,
        }),
      }).catch(() => { /* silencioso */ })
    } catch (err) {
      console.error(err)
      toast.error('Error registrando la run.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPending = clients.reduce((sum, c) =>
    sum + c.characters.reduce((s2, ch) =>
      s2 + ch.selectedBosses.filter((b) => !clearedKeys.has(`${c.id}:${b.id}`)).length, 0), 0)

  const totalDone = clients.reduce((sum, c) =>
    sum + c.characters.reduce((s2, ch) =>
      s2 + ch.selectedBosses.filter((b) => clearedKeys.has(`${c.id}:${b.id}`)).length, 0), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-amber-400/15 bg-card/60 p-6 backdrop-blur-sm">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 120% at 100% 50%, rgba(99,58,180,0.1) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-violet-400/70 mb-1">Piloto</p>
          <h1 className="font-cinzel text-3xl font-bold text-foreground">Mis Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona las runs de tus clientes asignados.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
          <span className="text-sm">Cargando clientes...</span>
        </div>
      ) : clients.length === 0 ? (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No tienes clientes asignados todavía.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">El administrador te asignará clientes desde el panel.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Clientes', value: clients.length, color: 'text-foreground', border: 'border-border/60' },
              { label: 'Completadas', value: totalDone, color: 'text-emerald-400', border: 'border-emerald-500/20' },
              { label: 'Pendientes', value: totalPending, color: 'text-amber-400', border: 'border-amber-500/20' },
            ].map((s) => (
              <Card key={s.label} className={`border ${s.border} bg-card/60 text-center backdrop-blur-sm`}>
                <CardContent className="py-5">
                  <p className={`font-cinzel text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-xs font-semibold tracking-widest uppercase text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Clients list */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="font-cinzel text-base tracking-widest uppercase">Runs de esta semana</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {clients.map((client) => {
                  const isExpanded = expandedClient === client.id
                  const clientPending = client.characters.reduce(
                    (s, ch) => s + ch.selectedBosses.filter((b) => !clearedKeys.has(`${client.id}:${b.id}`)).length, 0
                  )
                  const clientDone = client.characters.reduce(
                    (s, ch) => s + ch.selectedBosses.filter((b) => clearedKeys.has(`${client.id}:${b.id}`)).length, 0
                  )

                  return (
                    <div key={client.id}>
                      {/* Client row */}
                      <button
                        onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                        className="w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-violet-400/[0.03]"
                      >
                        {client.avatarUrl ? (
                          <img src={client.avatarUrl} alt={client.displayName}
                            className="h-9 w-9 rounded-full border border-violet-500/30 flex-shrink-0 object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full border border-violet-500/30 bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-violet-400">
                              {client.displayName.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-cinzel font-bold text-foreground">{client.displayName}</span>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {clientDone > 0 && (
                            <span className="text-xs font-semibold text-emerald-400">✓ {clientDone}</span>
                          )}
                          {clientPending > 0 && (
                            <span className="text-xs font-semibold text-amber-400">○ {clientPending}</span>
                          )}
                          <span className="text-muted-foreground/40 text-sm">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {/* Expanded: characters & bosses */}
                      {isExpanded && (
                        <div className="border-t border-border/20 bg-background/20 px-4 py-4 space-y-5">
                          {client.characters.length === 0 ? (
                            <p className="text-sm text-muted-foreground/60 text-center py-4">
                              Este cliente no tiene personajes registrados.
                            </p>
                          ) : (
                            client.characters.map((char) => (
                              <div key={char.id}>
                                {/* Character header */}
                                <div className="flex items-center gap-3 mb-3">
                                  {char.imageUrl && (
                                    <img src={char.imageUrl} alt={char.name}
                                      className="h-12 w-auto object-contain flex-shrink-0"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-cinzel font-bold text-sm text-foreground">{char.name}</p>
                                    <p className="text-xs text-muted-foreground">{char.class} · Lv. {char.level}</p>
                                  </div>
                                  <button
                                    onClick={() => toggleLock(char.id, !!char.bossesLocked)}
                                    disabled={lockingCharIds.has(char.id)}
                                    title={char.bossesLocked ? 'Desbloquear selección de bosses' : 'Bloquear selección de bosses'}
                                    className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                      char.bossesLocked
                                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                        : 'border-border/40 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    {lockingCharIds.has(char.id) ? (
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : char.bossesLocked ? '🔒' : '🔓'}
                                    {char.bossesLocked ? 'Bloqueado' : 'Bloquear'}
                                  </button>
                                </div>

                                {/* Boss list */}
                                {char.selectedBosses.length === 0 ? (
                                  <p className="text-xs text-muted-foreground/50 ml-4">Sin bosses seleccionados.</p>
                                ) : (
                                  <div className="space-y-1.5 ml-4">
                                    {char.selectedBosses.map((boss) => {
                                      const key = `${client.id}:${char.id}:${boss.id}`
                                      const isCleared = clearedKeys.has(key)
                                      const record = weekRecords[key]
                                      const isFormOpen = clearForm?.clientId === client.id && clearForm?.charId === char.id && clearForm?.bossId === boss.id

                                      return (
                                        <div key={boss.id} className={`rounded-lg border transition-all ${
                                          isCleared
                                            ? 'border-emerald-500/30 bg-emerald-950/20'
                                            : 'border-border/40 bg-background/30'
                                        }`}>
                                          {/* Boss row */}
                                          <div className="flex items-center gap-3 px-3 py-2">
                                            {boss.imageUrl ? (
                                              <img src={boss.imageUrl} alt={boss.name}
                                                className="h-8 w-8 rounded object-cover flex-shrink-0" />
                                            ) : (
                                              <div className="h-8 w-8 rounded bg-muted/30 flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-foreground">{boss.name}</span>
                                                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${diffStyle(boss.difficulty)}`}>
                                                  {boss.difficulty}
                                                </span>
                                              </div>
                                            </div>

                                            {isCleared ? (
                                              <div className="flex items-center gap-2">
                                                <span className="text-emerald-400 text-sm font-bold">✓ Completado</span>
                                                {record?.imageUrls && record.imageUrls.length > 0 && (
                                                  <a
                                                    href={record.imageUrls[0]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-muted-foreground hover:text-amber-400 transition-colors"
                                                  >
                                                    📷
                                                  </a>
                                                )}
                                              </div>
                                            ) : (
                                              <Button
                                                size="sm"
                                                onClick={() => openForm(client.id, char.id, boss.id, char.name, boss.name)}
                                                className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-7 px-3"
                                              >
                                                Marcar hecho
                                              </Button>
                                            )}
                                          </div>

                                          {/* Inline form */}
                                          {isFormOpen && (
                                            <div
                                              className="border-t border-border/30 px-3 py-3 space-y-3 bg-background/40"
                                              onPaste={handlePaste}
                                            >
                                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                                Registrar clear — {clearForm.bossName}
                                              </p>
                                              <div className="grid grid-cols-2 gap-2">
                                                {/* Fecha */}
                                                <div>
                                                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fecha</label>
                                                  <input
                                                    type="date"
                                                    value={formDate}
                                                    onChange={(e) => setFormDate(e.target.value)}
                                                    className="mt-1 w-full rounded border border-border/60 bg-input/80 px-2 py-1.5 text-sm focus:border-amber-400/50 focus:outline-none"
                                                  />
                                                </div>

                                                {/* Imagen — paste o archivo */}
                                                <div>
                                                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                                    Screenshot (opcional · expira en 14 días)
                                                  </label>
                                                  <div
                                                    onClick={() => !formImagePreview && fileInputRef.current?.click()}
                                                    className={`relative mt-1 flex min-h-[62px] w-full items-center justify-center overflow-hidden rounded border-2 border-dashed transition-colors ${
                                                      formImagePreview
                                                        ? 'border-violet-500/40 cursor-default'
                                                        : 'border-border/50 bg-input/30 cursor-pointer hover:border-violet-400/60'
                                                    }`}
                                                  >
                                                    {formImagePreview ? (
                                                      <>
                                                        <img
                                                          src={formImagePreview}
                                                          alt="preview"
                                                          className="max-h-28 w-full object-contain"
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={(e) => { e.stopPropagation(); clearImage() }}
                                                          className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-black/90"
                                                        >
                                                          ✕
                                                        </button>
                                                      </>
                                                    ) : (
                                                      <div className="select-none py-2 text-center">
                                                        <p className="text-xs font-semibold text-muted-foreground">📋 Ctrl+V para pegar</p>
                                                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">o clic para subir archivo</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                  />
                                                </div>
                                              </div>

                                              {/* Notas */}
                                              <div>
                                                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Notas (opcional)</label>
                                                <input
                                                  type="text"
                                                  placeholder="Split, mule, etc."
                                                  value={formNotes}
                                                  onChange={(e) => setFormNotes(e.target.value)}
                                                  className="mt-1 w-full rounded border border-border/60 bg-input/80 px-2 py-1.5 text-sm focus:border-amber-400/50 focus:outline-none"
                                                />
                                              </div>

                                              <div className="flex gap-2">
                                                <Button
                                                  size="sm"
                                                  onClick={submitClear}
                                                  disabled={submitting}
                                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                                                >
                                                  {submitting ? (
                                                    <span className="flex items-center gap-1.5">
                                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                      {formImageFile ? 'Subiendo...' : 'Guardando...'}
                                                    </span>
                                                  ) : '✓ Confirmar clear'}
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => { setClearForm(null); clearImage() }}
                                                  className="text-xs"
                                                >
                                                  Cancelar
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
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
        </>
      )}
    </div>
  )
}
