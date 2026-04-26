import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const nav = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/fornecedores', label: 'Fornecedores', icon: 'domain' },
  { to: '/obras', label: 'Obras', icon: 'apartment' },
  { to: '/pagamentos', label: 'Pagamentos', icon: 'receipt' },
  { to: '/relatorios', label: 'Relatórios', icon: 'description' },
  { to: '/historico', label: 'Histórico', icon: 'history' },
  { to: '/configuracoes', label: 'Configurações', icon: 'settings' }
]

export function AppShell() {
  const [pendingCount, setPendingCount] = useState(0)
  
  useEffect(() => {
    // Just a placeholder to show the badge concept
    const fetchPending = async () => {
      const { count } = await supabase.from('pagamentos').select('id', { count: 'exact', head: true }).eq('status', 'pendente')
      if (count !== null) setPendingCount(count)
    }
    fetchPending()
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <div className="grid min-h-screen grid-cols-[220px_1fr]">
        <aside className="bg-primary border-r border-border flex flex-col relative h-screen">
          <div className="p-6">
            <h1 className="text-[24px] font-[800] tracking-[-0.5px] text-white">ReciBox</h1>
            <p className="mt-1 text-text-muted text-[12px] font-[500]">Pagamentos & Recibos</p>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-sm text-[13px] font-[600] transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-br from-accent to-accent-hover shadow-glow text-white' 
                      : 'text-text-secondary hover:text-white hover:bg-surface-hover'
                  }`
                }
              >
                <span className="material-icons-round text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
                {item.to === '/pagamentos' && pendingCount > 0 && (
                  <span className="ml-auto bg-danger text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          
          <div className="p-4 border-t border-border mt-auto">
            <button
              className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-[600] text-text-secondary hover:text-white hover:bg-surface-hover rounded-sm transition-all duration-200"
              onClick={() => supabase.auth.signOut()}
            >
              <span className="material-icons-round text-[18px]">logout</span>
              Sair
            </button>
            
            <div className="mt-4 flex items-center gap-2 px-3 text-[11px] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot"></span>
              <span>Sincronizado</span>
            </div>
          </div>
        </aside>
        
        <main className="flex flex-col bg-bg h-screen overflow-hidden">
          <div className="h-[40px] border-b border-border bg-primary/50 flex items-center px-4 draggable" style={{ WebkitAppRegion: 'drag' } as any}>
            <span className="text-[11px] font-[600] text-text-muted uppercase tracking-[0.5px]">ReciBox Workspace</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
