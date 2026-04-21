import type { Difficulty } from './types'

/** Clases CSS para badge de dificultad (badges pequeños en tablas/listas) */
export function diffStyle(d: Difficulty | string): string {
  switch (d) {
    case 'Easy':    return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
    case 'Normal':  return 'border-sky-500/40 text-sky-400 bg-sky-500/10'
    case 'Hard':    return 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
    case 'Chaos':   return 'border-red-500/40 text-red-400 bg-red-500/10'
    case 'Extreme': return 'border-orange-500/40 text-orange-400 bg-orange-500/10'
    default:        return 'border-border/40 text-muted-foreground bg-muted/10'
  }
}

/** Clases CSS para botón de dificultad SELECCIONADO (boss selector) */
export function diffSelectedStyle(d: Difficulty | string): string {
  switch (d) {
    case 'Easy':    return 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_oklch(0.7_0.17_160/0.4)]'
    case 'Normal':  return 'border-sky-500 bg-sky-500/20 text-sky-300 shadow-[0_0_10px_oklch(0.6_0.2_240/0.4)]'
    case 'Hard':    return 'border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_10px_oklch(0.85_0.2_95/0.4)]'
    case 'Chaos':   return 'border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_10px_oklch(0.6_0.25_25/0.4)]'
    case 'Extreme': return 'border-orange-500 bg-orange-500/20 text-orange-300 shadow-[0_0_10px_oklch(0.75_0.2_55/0.5)]'
    default:        return 'border-border bg-muted/20 text-foreground'
  }
}

/** Orden de dificultad para sorting */
export const DIFF_ORDER: Record<string, number> = {
  Easy: 0, Normal: 1, Hard: 2, Chaos: 3, Extreme: 4,
}
