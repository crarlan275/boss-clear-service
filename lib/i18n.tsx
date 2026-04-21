'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Lang = 'es' | 'en'

// ── Translations ──────────────────────────────────────────────────────────────
export const T = {
  es: {
    nav: {
      clears:    'Mis Clears',
      characters:'Personajes',
      weekly:    'Semana Actual',
      admin:     'Admin',
      pilot:     'Mis Clientes',
    },
    dropdown: {
      clears:    'Mis Clears',
      characters:'Mis Personajes',
      weekly:    'Semana Actual',
      admin:     'Panel Admin',
      pilot:     'Mis Clientes',
      signout:   'Cerrar sesión',
    },
    char: {
      title:       'Gestión de Personajes',
      subtitle:    'Mis Personajes',
      description: 'Registra tu personaje y selecciona los bosses que deseas que te limpien.',
      addTitle:    'Agregar Personaje',
      searchPlaceholder: 'Nombre del personaje (IGN)',
      search:      'Buscar',
      searching:   'Buscando...',
      register:    'Registrar',
      registering: 'Registrando...',
      notFound:    'Personaje no encontrado',
      connError:   'Error de conexión. Intenta de nuevo.',
      noChars:     'No tienes personajes registrados. Busca tu IGN arriba.',
      loading:     'Cargando personajes...',
      canBlink:    '⚡ Puede Blinkear',
      collapse:    'Contraer',
      expand:      'Expandir',
      delete:      'Eliminar',
      confirmDelete: (name: string) => `¿Eliminar el personaje "${name}" de tu cuenta?`,
      deleteSuccess: 'Personaje eliminado.',
      deleteError:   'Error eliminando el personaje.',
      bosses:      'Selecciona los bosses que quieres clearear',
      noBosses:    'No hay bosses disponibles aún.',
      total:       'Total',
      mesos:       'mesos',
      bossCount:   (n: number) => `${n} boss${n !== 1 ? 'es' : ''}`,
      selected:    (n: number) => `${n} boss${n !== 1 ? 'es' : ''} seleccionado${n !== 1 ? 's' : ''}`,
      noBossesSelected: 'Sin bosses seleccionados — expande para configurar.',
      alreadyRegistered: 'Ya tienes este personaje registrado.',
      takenByOther: 'Este personaje ya está registrado por otro usuario.',
      registerSuccess: (name: string) => `${name} registrado correctamente.`,
      registerError: 'Error al registrar el personaje.',
      updateError:   'Error actualizando selección.',
    },
    weekly: {
      title:    'Semana Actual',
      subtitle: 'Clears de la semana',
      noPost:   'No hay post activo esta semana.',
      loading:  'Cargando...',
    },
    dashboard: {
      title:    'Mis Clears',
      noClears: 'No tienes clears registrados aún.',
      loading:  'Cargando...',
    },
  },
  en: {
    nav: {
      clears:    'My Clears',
      characters:'Characters',
      weekly:    'Current Week',
      admin:     'Admin',
      pilot:     'My Clients',
    },
    dropdown: {
      clears:    'My Clears',
      characters:'My Characters',
      weekly:    'Current Week',
      admin:     'Admin Panel',
      pilot:     'My Clients',
      signout:   'Sign out',
    },
    char: {
      title:       'Character Management',
      subtitle:    'My Characters',
      description: 'Register your character and select the bosses you want cleared.',
      addTitle:    'Add Character',
      searchPlaceholder: 'Character name (IGN)',
      search:      'Search',
      searching:   'Searching...',
      register:    'Register',
      registering: 'Registering...',
      notFound:    'Character not found',
      connError:   'Connection error. Please try again.',
      noChars:     'No characters registered. Search your IGN above.',
      loading:     'Loading characters...',
      canBlink:    '⚡ Can Blink',
      collapse:    'Collapse',
      expand:      'Expand',
      delete:      'Delete',
      confirmDelete: (name: string) => `Delete character "${name}" from your account?`,
      deleteSuccess: 'Character deleted.',
      deleteError:   'Error deleting character.',
      bosses:      'Select the bosses you want cleared',
      noBosses:    'No bosses available yet.',
      total:       'Total',
      mesos:       'mesos',
      bossCount:   (n: number) => `${n} boss${n !== 1 ? 'es' : ''}`,
      selected:    (n: number) => `${n} boss${n !== 1 ? 'es' : ''} selected`,
      noBossesSelected: 'No bosses selected — expand to configure.',
      alreadyRegistered: 'You already have this character registered.',
      takenByOther: 'This character is already registered by another user.',
      registerSuccess: (name: string) => `${name} registered successfully.`,
      registerError: 'Error registering character.',
      updateError:   'Error updating selection.',
    },
    weekly: {
      title:    'Current Week',
      subtitle: 'Weekly Clears',
      noPost:   'No active post this week.',
      loading:  'Loading...',
    },
    dashboard: {
      title:    'My Clears',
      noClears: 'No clears registered yet.',
      loading:  'Loading...',
    },
  },
} as const

export type Translations = typeof T['es']

// ── Context ───────────────────────────────────────────────────────────────────
interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const LangContext = createContext<LangContextValue>({
  lang: 'es',
  setLang: () => {},
  t: T.es as Translations,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'en' || stored === 'es') setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: T[lang] as Translations }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
