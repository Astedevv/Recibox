import { Home, Users, Receipt, History, Settings, LogOut, FileSpreadsheet } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const nav = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/fornecedores', label: 'Fornecedores', icon: Users },
  { to: '/pagamentos', label: 'Pagamentos', icon: Receipt },
  { to: '/relatorios', label: 'Relatórios', icon: FileSpreadsheet },
  { to: '/historico', label: 'Histórico', icon: History },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
]

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="bg-gradient-to-b from-blue-700 to-orange-500 p-6 text-white">
          <h1 className="text-2xl font-bold">ReciBox</h1>
          <p className="mt-1 text-sm text-white/80">Pagamentos & Recibos</p>
          <nav className="mt-8 space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 transition ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <button
            className="mt-10 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut size={16} />
            Sair
          </button>
        </aside>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
