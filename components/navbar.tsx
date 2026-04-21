'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLang } from '@/lib/i18n'
import type { Profile } from '@/lib/types'

export function Navbar({ profile }: { profile: Profile }) {
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang, t } = useLang()

  async function handleSignOut() {
    await signOut(auth)
    router.push('/login')
  }

  const initials = profile.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        className={`relative text-xs font-semibold tracking-[0.15em] uppercase transition-colors duration-200 after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-amber-400 after:transition-transform after:duration-300 hover:text-amber-400 hover:after:scale-x-100 ${
          active ? 'text-amber-400 after:scale-x-100' : 'text-muted-foreground'
        }`}
      >
        {children}
      </Link>
    )
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">

        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-amber-400/30 bg-amber-400/10 transition-all duration-300 group-hover:border-amber-400/60 group-hover:bg-amber-400/15 group-hover:shadow-[0_0_12px_oklch(0.76_0.165_82/0.3)]">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 0L9.8 6.2H16L10.9 10L12.7 16L8 12.2L3.3 16L5.1 10L0 6.2H6.2L8 0Z" fill="oklch(0.76 0.165 82)" />
              </svg>
            </div>
            <span className="font-cinzel text-sm font-bold tracking-[0.15em] text-amber-400 uppercase">
              BCS
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden items-center gap-6 sm:flex">
            <NavLink href="/dashboard">{t.nav.clears}</NavLink>
            <NavLink href="/dashboard/character">{t.nav.characters}</NavLink>
            <NavLink href="/weekly">{t.nav.weekly}</NavLink>
            {(profile.role === 'pilot' || profile.role === 'admin' || profile.isPilot) && (
              <NavLink href="/pilot">{t.nav.pilot}</NavLink>
            )}
            {profile.role === 'admin' && (
              <NavLink href="/admin">{t.nav.admin}</NavLink>
            )}
          </div>
        </div>

        {/* Right side: lang toggle + avatar */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="flex items-center gap-1.5 rounded border border-border/40 bg-background/40 px-2.5 py-1 text-xs font-bold tracking-wider text-muted-foreground transition-all hover:border-amber-400/40 hover:text-amber-400"
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {lang === 'es' ? 'EN' : 'ES'}
          </button>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none">
              <Avatar className="h-8 w-8 cursor-pointer border border-amber-400/30 shadow-[0_0_10px_oklch(0.76_0.165_82/0.2)] transition-all duration-300 hover:border-amber-400/60 hover:shadow-[0_0_16px_oklch(0.76_0.165_82/0.35)]">
                {profile.avatarUrl && (
                  <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                )}
                <AvatarFallback className="bg-amber-400/10 text-amber-400 text-xs font-bold font-cinzel">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 border-border/60 bg-popover/95 backdrop-blur-sm">
              <DropdownMenuLabel>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 border border-amber-400/20">
                    {profile.avatarUrl && (
                      <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                    )}
                    <AvatarFallback className="bg-amber-400/10 text-amber-400 text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">{profile.displayName}</span>
                    <span className="text-xs text-muted-foreground font-normal truncate">{profile.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={() => router.push('/dashboard')}>{t.dropdown.clears}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/character')}>{t.dropdown.characters}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/weekly')}>{t.dropdown.weekly}</DropdownMenuItem>

              {(profile.role === 'pilot' || profile.role === 'admin' || profile.isPilot) && (
                <>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={() => router.push('/pilot')}>{t.dropdown.pilot}</DropdownMenuItem>
                </>
              )}
              {profile.role === 'admin' && (
                <>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={() => router.push('/admin')}>{t.dropdown.admin}</DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                ⚙️ Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={handleSignOut}
              >
                {t.dropdown.signout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
