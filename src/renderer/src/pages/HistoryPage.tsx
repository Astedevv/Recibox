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
        <h1 className="text-white">Histórico</h1>
        <p className="mt-1 text-text-muted text-[13px]">Acompanhe todos os pagamentos e comprovantes emitidos.</p>
      </div>

      <div className="bg-surface border border-border shadow-card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-[12px] p-5">
        <div>
          <label className="block text-[12px] text-text-muted mb-1 font-[500]">Fornecedor</label>
          <select className="input-field" value={filters.fornecedor} onChange={(e) => setFilters((f) => ({ ...f, fornecedor: e.target.value }))}>
            <option value="">Todos</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
      </div>

      <div className="bg-surface border border-border shadow-card overflow-hidden rounded-[12px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header px-5 py-4">Data</th>
                <th className="table-header px-5 py-4">Fornecedor</th>
                <th className="table-header px-5 py-4">Valor</th>
                <th className="table-header px-5 py-4">Status</th>
                <th className="table-header px-5 py-4">Assinatura / Recibo</th>
                <th className="table-header px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="group hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-4 text-[13px] text-text-secondary">{p.data_pagamento}</td>
                  <td className="px-5 py-4">
                    <span className="text-white font-[500] text-[13px]">{suppliersById[p.fornecedor_id]?.nome ?? '-'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-money">{currencyBRL(Number(p.valor))}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={p.status} />
                    {p.status === 'confirmado' && (
                      <div className="text-[10px] text-text-muted mt-1" title={datetimeBR(p.confirmation_date)}>
                        Em {datetimeBR(p.confirmation_date).split(' ')[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[12px]">
                    {p.confirmation_signature ? (
                      <div className="text-text-secondary">
                        <div className="font-[600] text-success truncate max-w-[150px]" title={p.confirmation_signature}>{p.confirmation_signature}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">{p.confirmation_signer_name ?? '-'}</div>
                      </div>
                    ) : (
                      <span className="text-text-muted italic">Pendente</span>
                    )}
                    {p.pdf_url && (
                      <a className="mt-2 text-accent hover:text-accent-hover flex items-center gap-1 font-[500]" href={p.pdf_url} target="_blank" rel="noreferrer">
                        <span className="material-icons-round text-[14px]">picture_as_pdf</span>
                        Ver Recibo
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        title="WhatsApp"
                        className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-accent hover:bg-accent-glow flex items-center justify-center transition-colors"
                        onClick={() => copyWhatsapp(p)}
                      >
                        <span className="material-icons-round text-[16px]">chat</span>
                      </button>
                      <button 
                        title="E-mail"
                        className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-blue-400 hover:bg-blue-400/10 flex items-center justify-center transition-colors"
                        onClick={() => resendByEmail(p)}
                      >
                        <span className="material-icons-round text-[16px]">mail</span>
                      </button>
                      {p.share_link && (
                        <a 
                          title="Abrir Link"
                          className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-white hover:bg-surface flex items-center justify-center transition-colors" 
                          href={p.share_link} 
                          target="_blank" 
                          rel="noreferrer"
                        >
                          <span className="material-icons-round text-[16px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="px-5 py-12 text-center text-text-muted text-[13px]" colSpan={6}>
                    <span className="material-icons-round text-[32px] text-primary-lighter block mb-2">history_toggle_off</span>
                    Nenhum histórico encontrado.
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
