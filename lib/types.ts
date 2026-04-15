export type Role = 'client' | 'admin'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          role: Role
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string
          role?: Role
          created_at?: string
        }
        Update: {
          display_name?: string
          role?: Role
        }
      }
      bosses: {
        Row: {
          id: string
          name: string
          difficulty: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          difficulty: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          difficulty?: string
          is_active?: boolean
        }
      }
      weekly_posts: {
        Row: {
          id: string
          week_start: string
          notes: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          week_start: string
          notes?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          notes?: string | null
        }
      }
      weekly_post_bosses: {
        Row: {
          id: string
          weekly_post_id: string
          boss_id: string
        }
        Insert: {
          id?: string
          weekly_post_id: string
          boss_id: string
        }
        Update: Record<string, never>
      }
      client_records: {
        Row: {
          id: string
          client_id: string
          boss_id: string
          weekly_post_id: string | null
          cleared_at: string
          notes: string | null
          added_by: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          boss_id: string
          weekly_post_id?: string | null
          cleared_at: string
          notes?: string | null
          added_by: string
          created_at?: string
        }
        Update: {
          notes?: string | null
          cleared_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Boss = Database['public']['Tables']['bosses']['Row']
export type WeeklyPost = Database['public']['Tables']['weekly_posts']['Row']
export type WeeklyPostBoss = Database['public']['Tables']['weekly_post_bosses']['Row']
export type ClientRecord = Database['public']['Tables']['client_records']['Row']

export type WeeklyPostWithBosses = WeeklyPost & {
  weekly_post_bosses: Array<{ boss_id: string; bosses: Boss }>
}

export type ClientRecordWithDetails = ClientRecord & {
  bosses: Boss
  weekly_posts: WeeklyPost | null
}
