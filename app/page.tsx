import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const BOSSES = ['Lucid', 'Will', 'Kalos', 'Gloom', 'Darknell', 'Seren', 'Kaling', 'Limbo', 'Lotus', 'Damien', 'Verus Hilla']

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex flex-col items-center justify-center select-none">

      {/* ── Ambient background orbs ───────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-pulse-glow absolute top-[-10%] left-1/2 -translate-x-1/2 h-[480px] w-[700px] rounded-full bg-[oklch(0.62_0.22_297/0.09)] blur-[130px]" />
        <div className="animate-pulse-glow absolute bottom-[-5%] right-[-5%] h-[350px] w-[350px] rounded-full bg-[oklch(0.76_0.165_82/0.07)] blur-[110px]" style={{ animationDelay: '1.5s' }} />
        <div className="absolute left-[-8%] top-[40%] h-[250px] w-[250px] rounded-full bg-[oklch(0.62_0.24_25/0.04)] blur-[90px]" />
      </div>

      {/* ── Floating geometric shapes ─────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Diamond top-left */}
        <div className="animate-float absolute top-[12%] left-[8%] h-4 w-4 rotate-45 border border-amber-400/20 bg-amber-400/5" style={{ animationDelay: '0s' }} />
        {/* Diamond top-right */}
        <div className="animate-float-slow absolute top-[20%] right-[10%] h-6 w-6 rotate-45 border border-violet-400/20 bg-violet-400/5" style={{ animationDelay: '1s' }} />
        {/* Small dot cluster */}
        <div className="animate-float absolute bottom-[25%] left-[12%] h-2 w-2 rounded-full bg-amber-400/25" style={{ animationDelay: '2s' }} />
        <div className="animate-float-slow absolute bottom-[30%] left-[15%] h-1.5 w-1.5 rounded-full bg-amber-400/15" style={{ animationDelay: '0.5s' }} />
        {/* Diamond bottom-right */}
        <div className="animate-float absolute bottom-[18%] right-[8%] h-3 w-3 rotate-45 border border-amber-400/15" style={{ animationDelay: '3s' }} />
        {/* Large faint diamond center */}
        <div className="animate-float-slow absolute top-[5%] right-[25%] h-10 w-10 rotate-45 border border-violet-400/10" style={{ animationDelay: '4s' }} />
      </div>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-3xl animate-slide-up">

        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-400/25 bg-amber-400/5 px-5 py-1.5 text-xs font-semibold tracking-[0.2em] text-amber-400/80 uppercase backdrop-blur-sm">
          <span className="text-amber-400">✦</span>
          MapleStory · Servicios de Boss Runs
          <span className="text-amber-400">✦</span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="font-cinzel text-6xl font-black tracking-[0.12em] text-shimmer sm:text-8xl uppercase leading-none">
            Boss Clear
          </h1>
          <h2 className="font-cinzel text-4xl font-bold tracking-[0.3em] text-foreground/70 sm:text-5xl uppercase">
            Service
          </h2>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-4">
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-400/70">
            <path d="M8 0L9.8 6.2H16L10.9 10L12.7 16L8 12.2L3.3 16L5.1 10L0 6.2H6.2L8 0Z" fill="currentColor" />
          </svg>
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        </div>

        {/* Description */}
        <p className="max-w-md text-base leading-relaxed text-muted-foreground font-[family-name:var(--font-nunito)]">
          Registra tu cuenta para consultar tu historial de boss clears y ver
          qué bosses completamos cada semana.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/register"
            className="group relative overflow-hidden rounded-md bg-amber-400 px-8 py-3 text-sm font-bold tracking-widest text-background uppercase transition-all duration-300 hover:bg-amber-300 hover:shadow-[0_0_30px_oklch(0.76_0.165_82/0.5)] active:scale-95"
          >
            <span className="relative z-10">Crear cuenta</span>
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-amber-400/30 bg-amber-400/5 px-8 py-3 text-sm font-bold tracking-widest text-amber-400 uppercase backdrop-blur-sm transition-all duration-300 hover:border-amber-400/60 hover:bg-amber-400/10 hover:shadow-[0_0_20px_oklch(0.76_0.165_82/0.15)] active:scale-95"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>

      {/* ── Bottom boss marquee ───────────────────────────── */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-0 overflow-hidden">
        <div className="flex gap-6 text-[10px] font-semibold tracking-[0.25em] text-muted-foreground/30 uppercase">
          {BOSSES.map((boss, i) => (
            <span key={boss} className="flex items-center gap-6 whitespace-nowrap">
              {boss}
              {i < BOSSES.length - 1 && <span className="text-amber-400/20">·</span>}
            </span>
          ))}
        </div>
      </div>

      {/* ── Faint horizontal rule ─────────────────────────── */}
      <div className="pointer-events-none absolute bottom-20 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
    </div>
  )
}
