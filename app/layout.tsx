import type { Metadata } from 'next'
import { Cinzel, Nunito } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/auth-context'
import { LangProvider } from '@/lib/i18n'
import { SparkleBackground } from '@/components/sparkle-bg'

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
})

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Boss Clear Service',
  description: 'Servicio de boss clears de MapleStory — rastrea tus clears semanales.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cinzel.variable} ${nunito.variable} h-full antialiased`}>
      <body className="relative min-h-full flex flex-col">
        <LangProvider>
          <AuthProvider>
            <SparkleBackground />
            <div className="relative z-10 flex min-h-full flex-col">
              {children}
            </div>
            <Toaster />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  )
}
