import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase, type Payment, type Supplier } from '@/lib/supabase'
import { currencyBRL } from '@/lib/utils'

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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Relatórios</h2>
      <div className="glass grid grid-cols-6 gap-3 rounded-2xl p-4">
        <select className="rounded-xl border px-3 py-2" value={filters.fornecedor} onChange={(e) => setFilters((f) => ({ ...f, fornecedor: e.target.value }))}>
          <option value="">Fornecedor</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <select className="rounded-xl border px-3 py-2" value={filters.obra} onChange={(e) => setFilters((f) => ({ ...f, obra: e.target.value }))}>
          <option value="">Obra</option>
          {obras.map((obra) => <option key={obra} value={obra}>{obra}</option>)}
        </select>
        <select className="rounded-xl border px-3 py-2" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">Status</option>
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
        </select>
        <input className="rounded-xl border px-3 py-2" type="date" value={filters.inicio} onChange={(e) => setFilters((f) => ({ ...f, inicio: e.target.value }))} />
        <input className="rounded-xl border px-3 py-2" type="date" value={filters.fim} onChange={(e) => setFilters((f) => ({ ...f, fim: e.target.value }))} />
        <button className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white" onClick={exportExcel}>Exportar Excel</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-sm text-slate-500">Itens filtrados</p>
          <p className="mt-1 text-2xl font-bold">{filtered.length}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-sm text-slate-500">Total filtrado</p>
          <p className="mt-1 text-2xl font-bold">{currencyBRL(total)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-sm text-slate-500">Confirmados</p>
          <p className="mt-1 text-2xl font-bold">{filtered.filter((p) => p.status === 'confirmado').length}</p>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Fornecedor</th>
              <th className="px-4 py-3 text-left">Obra</th>
              <th className="px-4 py-3 text-left">Valor</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{p.data_pagamento}</td>
                <td className="px-4 py-3">{suppliersById[p.fornecedor_id]?.nome ?? '-'}</td>
                <td className="px-4 py-3">{p.obra ?? '-'}</td>
                <td className="px-4 py-3">{currencyBRL(Number(p.valor))}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{p.confirmation_signature ?? '-'}</td>
              </tr>
            ))}
            {!filtered.length ? <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>Sem resultados para os filtros.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
