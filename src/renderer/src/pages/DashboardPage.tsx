import { useEffect, useMemo, useState } from 'react'
import { supabase, type Payment } from '@/lib/supabase'
import { StatCard } from '@/components/StatCard'
import { currencyBRL } from '@/lib/utils'

export function DashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [supplierCount, setSupplierCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [payRes, supRes] = await Promise.all([
        supabase.from('pagamentos').select('*').order('created_at', { ascending: false }),
        supabase.from('fornecedores').select('id', { count: 'exact', head: true })
      ])
      setPayments((payRes.data as Payment[]) ?? [])
      setSupplierCount(supRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const kpis = useMemo(() => {
    const total = payments.reduce((acc, p) => acc + Number(p.valor), 0)
    const confirmed = payments.filter((p) => p.status === 'confirmado')
    const pending = payments.filter((p) => p.status === 'pendente')
    return {
      total,
      confirmedTotal: confirmed.reduce((acc, p) => acc + Number(p.valor), 0),
      pendingCount: pending.length,
      confirmedCount: confirmed.length
    }
  }, [payments])

  if (loading) return <p className="text-text-muted text-[13px]">Carregando dashboard...</p>

  return (
    <div className="animate-fade-in">
      <h1 className="text-white">Dashboard</h1>
      <p className="mt-1 text-text-muted text-[13px]">Visão geral financeira e status de confirmações.</p>
      
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total pago" 
          value={currencyBRL(kpis.total)} 
          icon="account_balance_wallet"
          color="blue"
        />
        <StatCard 
          title="Total confirmado" 
          value={currencyBRL(kpis.confirmedTotal)} 
          icon="check_circle"
          color="green"
        />
        <StatCard 
          title="Pendentes" 
          value={String(kpis.pendingCount)} 
          icon="warning"
          color="yellow"
          pulse={kpis.pendingCount > 0}
        />
        <StatCard 
          title="Fornecedores" 
          value={String(supplierCount)} 
          hint={`${kpis.confirmedCount} pagamentos confirmados`} 
          icon="domain"
          color="orange"
        />
      </div>
    </div>
  )
}
