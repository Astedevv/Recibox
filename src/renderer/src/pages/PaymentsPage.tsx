import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { supabase, type CompanySettings, type Payment, type Supplier } from '@/lib/supabase'
import { currencyBRL, datetimeBR } from '@/lib/utils'

const paymentSchema = z.object({
  fornecedor_id: z.string().uuid(),
  valor: z.coerce.number().positive(),
  descricao: z.string().min(3),
  obra: z.string().min(1, 'Selecione uma obra'),
  forma_pagamento: z.string().min(2),
  data_pagamento: z.string().min(8)
})

const newToken = () => crypto.randomUUID().replaceAll('-', '')

export function PaymentsPage() {
  const desktopApi = window.reciboxApi
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [obras, setObras] = useState<{id: string, nome: string}[]>([])
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [processingIds, setProcessingIds] = useState<string[]>([])
  const autoProcessingRef = useRef(false)
  const [form, setForm] = useState({
    fornecedor_id: '',
    valor: '',
    descricao: '',
    obra: '',
    forma_pagamento: 'PIX',
    data_pagamento: new Date().toISOString().slice(0, 10)
  })

  const load = async () => {
    const [{ data: sup }, { data: pay }, { data: cfg }, { data: obs }] = await Promise.all([
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('pagamentos').select('*').order('created_at', { ascending: false }),
      supabase.from('configuracoes').select('*').limit(1).maybeSingle(),
      supabase.from('obras').select('*').order('nome')
    ])
    setSuppliers((sup as Supplier[]) ?? [])
    setPayments((pay as Payment[]) ?? [])
    setSettings((cfg as CompanySettings) ?? null)
    setObras(obs ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const suppliersById = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])

  const buildShareMessage = async (payment: Payment) => {
    if (!desktopApi) throw new Error('Essa ação exige o app desktop do ReciBox aberto.')
    const supplier = suppliersById[payment.fornecedor_id]
    if (!supplier) throw new Error('Fornecedor não encontrado.')
    return {
      supplier,
      share: await desktopApi.buildShareMessage({
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
    }
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault()
    const parsed = paymentSchema.safeParse(form)
    if (!parsed.success) return alert(parsed.error.issues[0]?.message)

    const insert = {
      ...parsed.data,
      status: 'pendente',
      confirmation_token: newToken()
    }
    const { error } = await supabase.from('pagamentos').insert(insert)
    if (error) return alert(error.message)
    setForm({ fornecedor_id: '', valor: '', descricao: '', obra: '', forma_pagamento: 'PIX', data_pagamento: new Date().toISOString().slice(0, 10) })
    load()
  }

  useEffect(() => {
    const autoGenerateReceipts = async () => {
      if (!desktopApi || !settings || autoProcessingRef.current) return
      if (!payments.length || !suppliers.length) return

      const pendingWork = payments.filter((payment) => {
        if (!suppliersById[payment.fornecedor_id]) return false
        return payment.status === 'confirmado' && payment.confirmation_signature && (!payment.pdf_path || !payment.pdf_path.includes('-signed-'))
      })

      if (!pendingWork.length) return

      const sessionData = await supabase.auth.getSession()
      const accessToken = sessionData.data.session?.access_token
      const userId = sessionData.data.session?.user.id
      if (!accessToken || !userId) return

      autoProcessingRef.current = true
      try {
        for (const payment of pendingWork) {
          const supplier = suppliersById[payment.fornecedor_id]
          if (!supplier) continue
          setProcessingIds((prev) => Array.from(new Set([...prev, payment.id])))
          if (payment.status === 'confirmado' && payment.confirmation_signature) {
            const result = await desktopApi.generateSignedReceipt({
              accessToken,
              userId,
              supplier: {
                id: supplier.id,
                nome: supplier.nome,
                cpf_cnpj: supplier.cpf_cnpj,
                pix: supplier.pix
              },
              company: {
                empresa_nome: settings.empresa_nome,
                cnpj: settings.cnpj,
                endereco: settings.endereco,
                logo_url: settings.logo_url,
                rodape: settings.rodape
              },
              payment: {
                id: payment.id,
                valor: Number(payment.valor),
                descricao: payment.descricao,
                forma_pagamento: payment.forma_pagamento,
                data_pagamento: payment.data_pagamento,
                obra: payment.obra,
                confirmation_token: payment.confirmation_token,
                fornecedor_id: payment.fornecedor_id,
                confirmation_date: payment.confirmation_date,
                confirmation_signature: payment.confirmation_signature,
                confirmation_signer_name: payment.confirmation_signer_name,
                confirmation_signer_document: payment.confirmation_signer_document
              }
            })
            await supabase
              .from('pagamentos')
              .update({ pdf_url: result.pdfUrl, pdf_path: result.pdfPath })
              .eq('id', payment.id)
          }
          setProcessingIds((prev) => prev.filter((id) => id !== payment.id))
        }
        await load()
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erro ao processar recibos automaticamente.')
      } finally {
        autoProcessingRef.current = false
        setProcessingIds([])
      }
    }

    autoGenerateReceipts()
  }, [payments, suppliers, settings, desktopApi, suppliersById])

  const isProcessing = (id: string) => processingIds.includes(id)

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
        <h1 className="text-white">Pagamentos</h1>
        <p className="mt-1 text-text-muted text-[13px]">Lance novos pagamentos e solicite os recibos.</p>
      </div>
      
      {!desktopApi ? (
        <div className="rounded-sm border border-danger/30 bg-danger-bg px-4 py-3 text-[13px] text-danger flex items-center gap-2">
          <span className="material-icons-round text-[18px]">warning</span>
          O app desktop não está com a bridge ativa. Reinicie o ReciBox para geração automática dos recibos.
        </div>
      ) : null}

      <form onSubmit={submitPayment} className="bg-surface border border-border rounded-[12px] p-6 shadow-card">
        <h3 className="text-white mb-4 flex items-center gap-2">
          <span className="material-icons-round text-accent text-[18px]">rocket_launch</span>
          Novo Lançamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="xl:col-span-2">
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Fornecedor *</label>
            <select required className="input-field" value={form.fornecedor_id} onChange={(e) => setForm((p) => ({ ...p, fornecedor_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Valor *</label>
            <input required className="input-field" placeholder="0,00" type="number" step="0.01" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} />
          </div>
          <div className="xl:col-span-3">
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Descrição *</label>
            <input required className="input-field" placeholder="Referente a..." value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
          </div>
          <div className="xl:col-span-2">
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Obra *</label>
            <select required className="input-field" value={form.obra} onChange={(e) => setForm((p) => ({ ...p, obra: e.target.value }))}>
              <option value="">Selecione a obra...</option>
              {obras.map((o) => <option key={o.id} value={o.nome}>{o.nome}</option>)}
            </select>
          </div>
          <div className="xl:col-span-2">
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Forma de Pgto *</label>
            <input required className="input-field" placeholder="Ex: PIX, Transferência" value={form.forma_pagamento} onChange={(e) => setForm((p) => ({ ...p, forma_pagamento: e.target.value }))} />
          </div>
          <div className="xl:col-span-2">
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Data *</label>
            <input required className="input-field" type="date" value={form.data_pagamento} onChange={(e) => setForm((p) => ({ ...p, data_pagamento: e.target.value }))} />
          </div>
        </div>
        <div className="mt-6">
          <button className="btn-accent flex items-center gap-2">
            <span className="material-icons-round text-[16px]">add</span>
            Registrar Pagamento
          </button>
        </div>
      </form>

      <div className="bg-surface border border-border rounded-[12px] overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header px-5 py-4 w-[250px]">Fornecedor</th>
                <th className="table-header px-5 py-4">Detalhes</th>
                <th className="table-header px-5 py-4">Valor</th>
                <th className="table-header px-5 py-4">Status</th>
                <th className="table-header px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id} className="group hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-4">
                    <div className="text-white font-[500] text-[13px]">{suppliersById[p.fornecedor_id]?.nome ?? '-'}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{datetimeBR(p.created_at || '')}</div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-text-secondary">
                    <div className="truncate max-w-[200px]" title={p.descricao}>{p.descricao}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{p.forma_pagamento} {p.obra ? `• ${p.obra}` : ''}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-money">{currencyBRL(Number(p.valor))}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {p.status === 'pendente' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="Copiar Link"
                          className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-success hover:bg-success-bg flex items-center justify-center transition-colors"
                          onClick={async () => {
                            try {
                              const { share } = await buildShareMessage(p)
                              await navigator.clipboard.writeText(share.link)
                              // Could use toast here
                            } catch (error) {
                              alert(error instanceof Error ? error.message : 'Não foi possível copiar.')
                            }
                          }}
                        >
                          <span className="material-icons-round text-[16px]">link</span>
                        </button>
                        <button
                          title="WhatsApp"
                          className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-accent hover:bg-accent-glow flex items-center justify-center transition-colors"
                          onClick={async () => {
                            try {
                              const { share } = await buildShareMessage(p)
                              await navigator.clipboard.writeText(share.whatsappMessage)
                            } catch (error) {
                              alert(error instanceof Error ? error.message : 'Não foi possível copiar a mensagem.')
                            }
                          }}
                        >
                          <span className="material-icons-round text-[16px]">content_copy</span>
                        </button>
                        <button
                          title="Enviar E-mail"
                          className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-blue-400 hover:bg-blue-400/10 flex items-center justify-center transition-colors"
                          onClick={async () => {
                            try {
                              const { supplier, share } = await buildShareMessage(p)
                              if (!supplier.email) throw new Error('Fornecedor sem e-mail cadastrado.')
                              await desktopApi?.openEmailClient({
                                to: supplier.email,
                                subject: share.emailSubject,
                                body: share.emailMessage
                              })
                            } catch (error) {
                              alert(error instanceof Error ? error.message : 'Não foi possível abrir o e-mail.')
                            }
                          }}
                        >
                          <span className="material-icons-round text-[16px]">mail</span>
                        </button>
                      </div>
                    ) : p.pdf_url ? (
                      <a 
                        className="btn-ghost flex items-center justify-center gap-2 max-w-max ml-auto text-accent hover:text-accent-hover" 
                        href={p.pdf_url} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        <span className="material-icons-round text-[16px]">picture_as_pdf</span>
                        Recibo
                      </a>
                    ) : isProcessing(p.id) ? (
                      <span className="text-text-muted text-[12px] flex items-center gap-1 justify-end">
                        <span className="material-icons-round animate-spin-slow text-[14px]">refresh</span>
                        Gerando...
                      </span>
                    ) : (
                      <span className="text-text-muted text-[12px]">Processando...</span>
                    )}
                  </td>
                </tr>
              ))}
              {!payments.length && (
                <tr>
                  <td className="px-5 py-12 text-center text-text-muted text-[13px]" colSpan={5}>
                    <span className="material-icons-round text-[32px] text-primary-lighter block mb-2">receipt_long</span>
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-text-muted">Última atualização: {datetimeBR(new Date().toISOString())}</p>
    </div>
  )
}
