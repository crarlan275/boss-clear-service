import { ProtectedLayout } from '@/components/protected-layout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout requireAdmin>{children}</ProtectedLayout>
}
