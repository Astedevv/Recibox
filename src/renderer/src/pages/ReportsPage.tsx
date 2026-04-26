import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase, type Payment, type Supplier } from '@/lib/supabase'
import { currencyBRL } from '@/lib/utils'
import { StatCard } from '@/components/StatCard'

export function ReportsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filters, setFilters] = useState({ fornecedor: '', obra: '', status: '', inicio: '', fim: '' })

  useEffect(() => {
    const load = async () => {
      const [{ data: pay }, { data: sup }] = await Promise.all([
        supabase.from('pagamentos').select('*').order('data_pagamento', { ascending: false }),
        supabase.from('fornecedores').select('*').order('nome')
      ])
      setPayments((pay as Payment[]) ?? [])
      setSuppliers((sup as Supplier[]) ?? [])
    }
    load()
  }, [])

  const suppliersById = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])
  const obras = useMemo(
    () => Array.from(new Set(payments.map((p) => p.obra).filter((obra): obra is string => Boolean(obra)))).sort(),
    [payments]
  )

  const filtered = payments.filter((p) => {
    if (filters.fornecedor && p.fornecedor_id !== filters.fornecedor) return false
    if (filters.obra && (p.obra ?? '') !== filters.obra) return false
    if (filters.status && p.status !== filters.status) return false
    if (filters.inicio && p.data_pagamento < filters.inicio) return false
    if (filters.fim && p.data_pagamento > filters.fim) return false
    return true
  })

  const total = filtered.reduce((acc, item) => acc + Number(item.valor), 0)
  const confirmedCount = filtered.filter((p) => p.status === 'confirmado').length

  function exportExcel() {
    const rows = filtered.map((p) => ({
      Data: p.data_pagamento,
      Fornecedor: suppliersById[p.fornecedor_id]?.nome ?? '-',
      Documento: suppliersById[p.fornecedor_id]?.cpf_cnpj ?? '-',
      Obra: p.obra ?? '-',
      Descricao: p.descricao,
      Valor: Number(p.valor),
      Forma: p.forma_pagamento,
      Status: p.status,
      ConfirmadoEm: p.confirmation_date ?? '-',
      Assinatura: p.confirmation_signature ?? '-',
      ConfirmadoPor: p.confirmation_signer_name ?? '-',
      DocumentoConfirmante: p.confirmation_signer_document ?? '-',
      ReciboUrl: p.pdf_url ?? '-'
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio')
    XLSX.writeFile(workbook, `relatorio-recibox-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const isPendente = status === 'pendente'
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-[600] ${isPendente ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isPendente ? 'bg-warning' : 'bg-success'}`}></span>
        {status.toUpperCase()}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-white">Relatórios</h1>
        <p className="mt-1 text-text-muted text-[13px]">Analise os pagamentos e exporte dados para Excel.</p>
      </div>

      <div className="bg-surface border border-border shadow-card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 rounded-[12px] p-5 items-end">
        <div>
          <label className="block text-[12px] text-text-muted mb-1 font-[500]">Fornecedor</label>
          <select className="input-field" value={filters.fornecedor} onChange={(e) => setFilters((f) => ({ ...f, fornecedor: e.target.value }))}>
            <option value="">Todos</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-text-muted mb-1 font-[500]">Obra</label>
          <select className="input-field" value={filters.obra} onChange={(e) => setFilters((f) => ({ ...f, obra: e.target.value }))}>
            <option value="">Todas</option>
            {obras.map((obra) => <option key={obra} value={obra}>{obra}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-text-muted mb-1 font-[500]">Status</label>
          <select className="input-field" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-text-muted mb-1 font-[500]">Data Início</label>
          <input className="input-field" type="date" value={filters.inicio} onChange={(e) => setFilters((f) => ({ ...f, inicio: e.target.value }))} />
        </div>
        <div>
          <label className="block text-[12px] text-text-muted mb-1 font-[500]">Data Fim</label>
          <input className="input-field" type="date" value={filters.fim} onChange={(e) => setFilters((f) => ({ ...f, fim: e.target.value }))} />
        </div>
        <div>
          <button className="btn-success w-full flex items-center justify-center gap-2" onClick={exportExcel}>
            <span className="material-icons-round text-[16px]">file_download</span>
            Exportar XLS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Itens filtrados" value={String(filtered.length)} icon="filter_alt" color="blue" />
        <StatCard title="Total filtrado" value={currencyBRL(total)} icon="account_balance_wallet" color="green" />
        <StatCard title="Confirmados" value={String(confirmedCount)} icon="check_circle" color="orange" hint={`${filtered.length - confirmedCount} pendentes`} />
      </div>

      <div className="bg-surface border border-border shadow-card overflow-hidden rounded-[12px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header px-5 py-4">Data</th>
                <th className="table-header px-5 py-4">Fornecedor</th>
                <th className="table-header px-5 py-4">Obra</th>
                <th className="table-header px-5 py-4">Valor</th>
                <th className="table-header px-5 py-4">Status</th>
                <th className="table-header px-5 py-4">Assinatura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="group hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-4 text-[13px] text-text-secondary">{p.data_pagamento}</td>
                  <td className="px-5 py-4 text-[13px] text-white font-[500]">{suppliersById[p.fornecedor_id]?.nome ?? '-'}</td>
                  <td className="px-5 py-4 text-[13px] text-text-secondary">{p.obra ?? '-'}</td>
                  <td className="px-5 py-4">
                    <span className="text-money">{currencyBRL(Number(p.valor))}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-4 text-[13px] text-text-secondary">
                    {p.confirmation_signature ? (
                      <span className="text-success truncate max-w-[150px] inline-block font-[600]" title={p.confirmation_signature}>{p.confirmation_signature}</span>
                    ) : (
                      <span className="text-text-muted italic">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="px-5 py-12 text-center text-text-muted text-[13px]" colSpan={6}>
                    <span className="material-icons-round text-[32px] text-primary-lighter block mb-2">table_chart</span>
                    Nenhum resultado para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
