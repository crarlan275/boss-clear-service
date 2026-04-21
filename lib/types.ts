export type Role = 'client' | 'admin' | 'pilot'

export interface Profile {
  id: string
  email: string
  displayName: string
  role: Role
  createdAt: string
  avatarUrl?: string
  pilotId?: string              // UID del piloto asignado (solo aplica a clientes)
  isPilot?: boolean             // true si tiene permisos de piloto (puede coexistir con role: 'admin')
  discordId?: string            // Discord User ID para notificaciones (ej: "123456789012345678")
  notificationsEnabled?: boolean // Si el cliente quiere recibir DMs de Discord al completar un boss
  lang?: 'es' | 'en'           // Idioma preferido del cliente
}

export type Difficulty = 'Easy' | 'Normal' | 'Hard' | 'Chaos' | 'Extreme'

export interface Boss {
  id: string
  name: string
  difficulty: Difficulty
  isActive: boolean
  price: number
  createdAt: string
  imageUrl?: string
}

/** Personaje de MapleStory registrado por un cliente */
export interface MapleCharacter {
  id: string              // document ID = character_name.toLowerCase()
  name: string
  class: string
  level: number
  world: string
  imageUrl: string
  ownerId: string         // Firebase user UID del dueño
  ownerDisplayName: string
  canBlink: boolean       // Toggle que activa el admin
  selectedBossIds: string[] // Bosses que el cliente quiere clearear
  bossesLocked: boolean   // Si true, el cliente no puede cambiar bosses
  createdAt: string
}

export interface WeeklyPost {
  id: string
  weekStart: string
  notes: string | null
  createdBy: string
  createdAt: string
  bossIds: string[]
}

export interface ClientRecord {
  id: string
  clientId: string
  charId?: string          // ID del maple_character al que pertenece el clear
  bossId: string
  weeklyPostId: string | null
  clearedAt: string
  notes: string | null
  imageUrls?: string[]
  /** Firebase Storage path — para borrar la imagen al expirar */
  imagePath?: string | null
  /** ISO timestamp de subida — imágenes >14 días se eliminan automáticamente */
  imageUploadedAt?: string | null
  addedBy: string
  createdAt: string
}

export interface ClientRecordWithDetails extends ClientRecord {
  boss: Boss
  weeklyPost: WeeklyPost | null
}
