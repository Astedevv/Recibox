import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { supabase, type CompanySettings, type Payment, type Supplier } from '@/lib/supabase'
import { currencyBRL, datetimeBR } from '@/lib/utils'

const paymentSchema = z.object({
  fornecedor_id: z.string().uuid(),
  valor: z.coerce.number().positive(),
  descricao: z.string().min(3),
  obra: z.string().optional(),
  forma_pagamento: z.string().min(2),
  data_pagamento: z.string().min(8)
})

const newToken = () => crypto.randomUUID().replaceAll('-', '')

export function PaymentsPage() {
  const desktopApi = window.reciboxApi
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [confirmationBaseUrl, setConfirmationBaseUrl] = useState('')
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
    const [{ data: sup }, { data: pay }, { data: cfg }] = await Promise.all([
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('pagamentos').select('*').order('created_at', { ascending: false }),
      supabase.from('configuracoes').select('*').limit(1).maybeSingle()
    ])
    setSuppliers((sup as Supplier[]) ?? [])
    setPayments((pay as Payment[]) ?? [])
    setSettings((cfg as CompanySettings) ?? null)
  }

  useEffect(() => {
    load()
    if (desktopApi?.getEnv) {
      desktopApi.getEnv().then((env) => setConfirmationBaseUrl(env.confirmationBaseUrl))
    }
  }, [])

  const suppliersById = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])

  async function submitPayment(e: FormEvent) {
    e.preventDefault()
    const parsed = paymentSchema.safeParse(form)
    if (!parsed.success) return alert(parsed.error.issues[0]?.message)

    const insert = {
      ...parsed.data,
      obra: parsed.data.obra || null,
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
        if (payment.status === 'confirmado' && payment.confirmation_signature) {
          return !payment.pdf_path || !payment.pdf_path.includes('-signed-')
        }
        return !payment.pdf_url
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
          } else {
            const result = await desktopApi.generateReceipt({
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
                fornecedor_id: payment.fornecedor_id
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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Pagamentos</h2>
      {confirmationBaseUrl.startsWith('recibox://') ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Defina <strong>VITE_CONFIRMATION_BASE_URL</strong> com uma URL pública para que o fornecedor confirme por e-mail fora do desktop.
        </div>
      ) : null}
      {!desktopApi ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          O app desktop não está com a bridge ativa. Reinicie o ReciBox para geração automática dos recibos.
        </div>
      ) : null}

      <form onSubmit={submitPayment} className="glass grid grid-cols-6 gap-3 rounded-2xl p-4">
        <select required className="rounded-xl border px-3 py-2" value={form.fornecedor_id} onChange={(e) => setForm((p) => ({ ...p, fornecedor_id: e.target.value }))}>
          <option value="">Fornecedor</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <input required className="rounded-xl border px-3 py-2" placeholder="Valor" type="number" step="0.01" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} />
        <input required className="rounded-xl border px-3 py-2" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
        <input className="rounded-xl border px-3 py-2" placeholder="Obra" value={form.obra} onChange={(e) => setForm((p) => ({ ...p, obra: e.target.value }))} />
        <input required className="rounded-xl border px-3 py-2" placeholder="Forma" value={form.forma_pagamento} onChange={(e) => setForm((p) => ({ ...p, forma_pagamento: e.target.value }))} />
        <input required className="rounded-xl border px-3 py-2" type="date" value={form.data_pagamento} onChange={(e) => setForm((p) => ({ ...p, data_pagamento: e.target.value }))} />
        <div className="col-span-6">
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Registrar pagamento</button>
        </div>
      </form>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Fornecedor</th>
              <th className="px-4 py-3 text-left">Valor</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Recibo</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{suppliersById[p.fornecedor_id]?.nome ?? '-'}</td>
                <td className="px-4 py-3">{currencyBRL(Number(p.valor))}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">
                  {p.pdf_url ? (
                    <a className="text-blue-600" href={p.pdf_url} target="_blank" rel="noreferrer">Abrir recibo</a>
                  ) : isProcessing(p.id) ? (
                    <span className="text-slate-500">Gerando...</span>
                  ) : (
                    <span className="text-slate-500">Aguardando processamento</span>
                  )}
                </td>
              </tr>
            ))}
            {!payments.length ? <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>Nenhum pagamento.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Última atualização: {datetimeBR(new Date().toISOString())}</p>
    </div>
  )
}
