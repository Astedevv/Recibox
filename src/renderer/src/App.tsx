import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SuppliersPage } from '@/pages/SuppliersPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ConfirmReceiptPage } from '@/pages/ConfirmReceiptPage'

function PrivateRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/fornecedores" element={<SuppliersPage />} />
        <Route path="/pagamentos" element={<PaymentsPage />} />
        <Route path="/historico" element={<HistoryPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6">Carregando sessão...</div>
  return (
    <Routes>
      <Route path="/confirm/:token" element={<ConfirmReceiptPage />} />
      <Route path="/*" element={user ? <PrivateRoutes /> : <LoginPage />} />
    </Routes>
  )
}
