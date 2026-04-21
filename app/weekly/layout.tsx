import { ProtectedLayout } from '@/components/protected-layout'

export default function WeeklyLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>
}
