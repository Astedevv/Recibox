import { useEffect, useMemo, useState } from 'react'
import { supabase, type CompanySettings, type Payment, type Supplier } from '@/lib/supabase'
import { currencyBRL, datetimeBR } from '@/lib/utils'

export function HistoryPage() {
  const desktopApi = window.reciboxApi
  const [payments, setPayments] = useState<Payment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [filters, setFilters] = useState({ status: '', fornecedor: '', inicio: '', fim: '' })

  useEffect(() => {
    const load = async () => {
      const [{ data: pay }, { data: sup }] = await Promise.all([
        supabase.from('pagamentos').select('*').order('data_pagamento', { ascending: false }),
        supabase.from('fornecedores').select('*')
      ])
      const { data: cfg } = await supabase.from('configuracoes').select('*').limit(1).maybeSingle()
      setPayments((pay as Payment[]) ?? [])
      setSuppliers((sup as Supplier[]) ?? [])
      setSettings((cfg as CompanySettings) ?? null)
    }
    load()
  }, [])

  const suppliersById = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])

  const filtered = payments.filter((p) => {
    if (filters.status && p.status !== filters.status) return false
    if (filters.fornecedor && p.fornecedor_id !== filters.fornecedor) return false
    if (filters.inicio && p.data_pagamento < filters.inicio) return false
    if (filters.fim && p.data_pagamento > filters.fim) return false
    return true
  })

  async function resendByEmail(payment: Payment) {
    if (!desktopApi) {
      alert('Essa ação exige o app desktop do ReciBox aberto.')
      return
    }
    const supplier = suppliersById[payment.fornecedor_id]
    if (!supplier?.email) {
      alert('Fornecedor sem e-mail cadastrado.')
      return
    }
    const share = await desktopApi.buildShareMessage({
      fornecedorNome: supplier.nome,
      fornecedorDocumento: supplier.cpf_cnpj,
      fornecedorPix: supplier.pix,
      valor: Number(payment.valor),
      descricao: payment.descricao,
      obra: payment.obra,
      formaPagamento: payment.forma_pagamento,
      dataPagamento: payment.data_pagamento,
      empresaNome: settings?.empresa_nome ?? 'ReciBox',
      empresaCnpj: settings?.cnpj ?? null,
      empresaEndereco: settings?.endereco ?? null,
      confirmationToken: payment.confirmation_token,
      confirmationBaseUrl: settings?.confirmation_base_url ?? ''
    })
    await desktopApi.openEmailClient({
      to: supplier.email,
      subject: share.emailSubject,
      body: share.emailMessage
    })
  }

  async function copyWhatsapp(payment: Payment) {
    if (!desktopApi) {
      alert('Essa ação exige o app desktop do ReciBox aberto.')
      return
    }
    const supplier = suppliersById[payment.fornecedor_id]
    if (!supplier) return
    const share = await desktopApi.buildShareMessage({
      fornecedorNome: supplier.nome,
      fornecedorDocumento: supplier.cpf_cnpj,
      fornecedorPix: supplier.pix,
      valor: Number(payment.valor),
      descricao: payment.descricao,
      obra: payment.obra,
      formaPagamento: payment.forma_pagamento,
      dataPagamento: payment.data_pagamento,
      empresaNome: settings?.empresa_nome ?? 'ReciBox',
      empresaCnpj: settings?.cnpj ?? null,
      empresaEndereco: settings?.endereco ?? null,
      confirmationToken: payment.confirmation_token,
      confirmationBaseUrl: settings?.confirmation_base_url ?? ''
    })
    await navigator.clipboard.writeText(share.whatsappMessage)
    alert('Mensagem copiada para WhatsApp.')
  }

  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold">Histórico</h2>
      <div className="glass grid grid-cols-4 gap-3 rounded-2xl p-4">
        <select className="rounded-xl border px-3 py-2" value={filters.fornecedor} onChange={(e) => setFilters((f) => ({ ...f, fornecedor: e.target.value }))}>
          <option value="">Fornecedor</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <select className="rounded-xl border px-3 py-2" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">Status</option>
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
        </select>
        <input className="rounded-xl border px-3 py-2" type="date" value={filters.inicio} onChange={(e) => setFilters((f) => ({ ...f, inicio: e.target.value }))} />
        <input className="rounded-xl border px-3 py-2" type="date" value={filters.fim} onChange={(e) => setFilters((f) => ({ ...f, fim: e.target.value }))} />
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Fornecedor</th>
              <th className="px-4 py-3 text-left">Valor</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Confirmado em</th>
              <th className="px-4 py-3 text-left">Assinatura</th>
              <th className="px-4 py-3 text-left">Recibo</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{p.data_pagamento}</td>
                <td className="px-4 py-3">{suppliersById[p.fornecedor_id]?.nome ?? '-'}</td>
                <td className="px-4 py-3">{currencyBRL(Number(p.valor))}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{datetimeBR(p.confirmation_date)}</td>
                <td className="px-4 py-3 text-xs">
                  {p.confirmation_signature ? (
                    <>
                      <div className="font-semibold">{p.confirmation_signature}</div>
                      <div>{p.confirmation_signer_name ?? '-'}</div>
                      <div>{p.confirmation_signer_document ?? '-'}</div>
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {p.pdf_url ? <a className="text-blue-600" href={p.pdf_url} target="_blank" rel="noreferrer">Baixar PDF</a> : '—'}
                </td>
                <td className="space-x-2 px-4 py-3">
                  <button className="rounded bg-amber-500 px-2 py-1 text-xs text-white" onClick={() => resendByEmail(p)}>E-mail</button>
                  <button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => copyWhatsapp(p)}>WhatsApp</button>
                  {p.share_link ? <a className="text-xs text-blue-600" href={p.share_link} target="_blank" rel="noreferrer">Ver link</a> : null}
                </td>
              </tr>
            ))}
            {!filtered.length ? <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>Sem resultados.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
