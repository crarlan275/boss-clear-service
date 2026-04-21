import { ProtectedLayout } from '@/components/protected-layout'

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout requirePilot>{children}</ProtectedLayout>
}
