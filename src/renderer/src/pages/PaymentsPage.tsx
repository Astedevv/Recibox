import { type FormEvent, useEffect, useMemo, useState } from 'react'
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
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [confirmationBaseUrl, setConfirmationBaseUrl] = useState('')
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
    if (editingPaymentId) {
      const { error } = await supabase
        .from('pagamentos')
        .update({
          fornecedor_id: parsed.data.fornecedor_id,
          valor: parsed.data.valor,
          descricao: parsed.data.descricao,
          obra: parsed.data.obra || null,
          forma_pagamento: parsed.data.forma_pagamento,
          data_pagamento: parsed.data.data_pagamento,
          pdf_url: null,
          pdf_path: null,
          share_link: null
        })
        .eq('id', editingPaymentId)
      if (error) return alert(error.message)
      alert('Pagamento atualizado. Gere o recibo novamente para refletir as alterações.')
    } else {
      const insert = {
        ...parsed.data,
        obra: parsed.data.obra || null,
        status: 'pendente',
        confirmation_token: newToken()
      }
      const { error } = await supabase.from('pagamentos').insert(insert)
      if (error) return alert(error.message)
    }
    setEditingPaymentId(null)
    setForm({ fornecedor_id: '', valor: '', descricao: '', obra: '', forma_pagamento: 'PIX', data_pagamento: new Date().toISOString().slice(0, 10) })
    load()
  }

  function startEditPayment(payment: Payment) {
    if (payment.status === 'confirmado') {
      alert('Pagamentos confirmados não podem ser editados.')
      return
    }
    setEditingPaymentId(payment.id)
    setForm({
      fornecedor_id: payment.fornecedor_id,
      valor: String(payment.valor),
      descricao: payment.descricao,
      obra: payment.obra ?? '',
      forma_pagamento: payment.forma_pagamento,
      data_pagamento: payment.data_pagamento
    })
  }

  function cancelEditPayment() {
    setEditingPaymentId(null)
    setForm({ fornecedor_id: '', valor: '', descricao: '', obra: '', forma_pagamento: 'PIX', data_pagamento: new Date().toISOString().slice(0, 10) })
  }

  async function removePayment(payment: Payment) {
    const ok = window.confirm(`Deseja apagar este pagamento de ${currencyBRL(Number(payment.valor))}?`)
    if (!ok) return
    const { error } = await supabase.from('pagamentos').delete().eq('id', payment.id)
    if (error) return alert(error.message)
    if (editingPaymentId === payment.id) cancelEditPayment()
    load()
  }

  async function generateReceipt(payment: Payment) {
    if (!desktopApi) {
      alert('A geração de recibo exige o app desktop do ReciBox aberto.')
      return
    }
    const supplier = suppliersById[payment.fornecedor_id]
    if (!supplier || !settings) return alert('Configure fornecedor e dados da empresa antes de gerar recibo.')
    const sessionData = await supabase.auth.getSession()
    const accessToken = sessionData.data.session?.access_token
    const userId = sessionData.data.session?.user.id
    if (!accessToken || !userId) return alert('Sessão inválida.')
    setBusyId(payment.id)
    try {
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

      const share = await desktopApi.buildShareMessage({
        fornecedorNome: supplier.nome,
        valor: Number(payment.valor),
        descricao: payment.descricao,
        confirmationToken: payment.confirmation_token
      })

      await supabase
        .from('pagamentos')
        .update({ pdf_url: result.pdfUrl, pdf_path: result.pdfPath, share_link: share.link })
        .eq('id', payment.id)

      if (supplier.email) {
        await desktopApi.openEmailClient({
          to: supplier.email,
          subject: share.emailSubject,
          body: share.emailMessage
        })
        alert('Recibo gerado. O e-mail de confirmação foi preparado no seu cliente padrão.')
      } else {
        await navigator.clipboard.writeText(share.emailMessage)
        alert('Recibo gerado. O fornecedor não possui e-mail cadastrado; mensagem copiada para a área de transferência.')
      }
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao gerar recibo.')
    } finally {
      setBusyId(null)
    }
  }

  async function resendByWhatsapp(payment: Payment) {
    if (!desktopApi) {
      alert('Essa ação exige o app desktop do ReciBox aberto.')
      return
    }
    const supplier = suppliersById[payment.fornecedor_id]
    if (!supplier) return
    const share = await desktopApi.buildShareMessage({
      fornecedorNome: supplier.nome,
      valor: Number(payment.valor),
      descricao: payment.descricao,
      confirmationToken: payment.confirmation_token
    })
    await navigator.clipboard.writeText(share.whatsappMessage)
    alert('Mensagem pronta copiada para WhatsApp.')
  }

  async function resendByEmail(payment: Payment) {
    if (!desktopApi) {
      alert('Essa ação exige o app desktop do ReciBox aberto.')
      return
    }
    const supplier = suppliersById[payment.fornecedor_id]
    if (!supplier) return
    if (!supplier.email) {
      alert('Esse fornecedor não possui e-mail cadastrado.')
      return
    }
    const share = await desktopApi.buildShareMessage({
      fornecedorNome: supplier.nome,
      valor: Number(payment.valor),
      descricao: payment.descricao,
      confirmationToken: payment.confirmation_token
    })
    await desktopApi.openEmailClient({
      to: supplier.email,
      subject: share.emailSubject,
      body: share.emailMessage
    })
    alert('Cliente de e-mail aberto com o link de confirmação.')
  }

  async function copyManualMessage(payment: Payment) {
    const supplier = suppliersById[payment.fornecedor_id]
    const fornecedorNome = supplier?.nome ?? 'Fornecedor'
    const valor = Number(payment.valor)

    let confirmationLink = payment.share_link ?? ''
    if (desktopApi) {
      const share = await desktopApi.buildShareMessage({
        fornecedorNome,
        valor,
        descricao: payment.descricao,
        confirmationToken: payment.confirmation_token
      })
      confirmationLink = share.link
    } else if (!confirmationLink && confirmationBaseUrl) {
      confirmationLink = `${confirmationBaseUrl.replace(/\/$/, '')}/${payment.confirmation_token}`
    }

    const lines = [
      `Olá, ${fornecedorNome}.`,
      '',
      'Segue o resumo do pagamento:',
      `- Valor: ${currencyBRL(valor)}`,
      `- Descrição: ${payment.descricao}`,
      `- Obra: ${payment.obra ?? '-'}`,
      `- Forma de pagamento: ${payment.forma_pagamento}`,
      `- Data do pagamento: ${payment.data_pagamento}`,
      `- Status: ${payment.status}`,
      '',
      confirmationLink ? `Confirmação de recebimento: ${confirmationLink}` : 'Confirmação de recebimento: link indisponível',
      payment.pdf_url ? `Recibo (PDF): ${payment.pdf_url}` : 'Recibo (PDF): ainda não gerado',
      '',
      'Atenciosamente,',
      'Equipe Financeira'
    ]

    await navigator.clipboard.writeText(lines.join('\n'))
    alert('Mensagem completa copiada para envio manual.')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Pagamentos</h2>
      {confirmationBaseUrl.startsWith('recibox://') ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Defina <strong>VITE_CONFIRMATION_BASE_URL</strong> com uma URL pública para que o fornecedor confirme por e-mail fora do desktop.
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
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">{editingPaymentId ? 'Salvar pagamento' : 'Registrar pagamento'}</button>
          {editingPaymentId ? (
            <button type="button" className="ml-2 rounded-xl border border-slate-300 px-4 py-2 text-slate-700" onClick={cancelEditPayment}>
              Cancelar edição
            </button>
          ) : null}
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
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{suppliersById[p.fornecedor_id]?.nome ?? '-'}</td>
                <td className="px-4 py-3">{currencyBRL(Number(p.valor))}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{p.pdf_url ? <a className="text-blue-600" href={p.pdf_url} target="_blank" rel="noreferrer">Abrir PDF</a> : '—'}</td>
                <td className="px-4 py-3 space-x-2">
                  <button disabled={busyId === p.id} className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50" onClick={() => generateReceipt(p)}>
                    {busyId === p.id ? 'Gerando...' : 'Gerar recibo'}
                  </button>
                  <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={() => startEditPayment(p)}>
                    Editar
                  </button>
                  <button className="rounded bg-rose-600 px-3 py-1 text-white" onClick={() => removePayment(p)}>
                    Apagar
                  </button>
                  <button className="rounded bg-violet-600 px-3 py-1 text-white" onClick={() => copyManualMessage(p)}>
                    Copiar mensagem
                  </button>
                  <button className="rounded bg-amber-500 px-3 py-1 text-white" onClick={() => resendByEmail(p)}>Enviar por e-mail</button>
                  <button className="rounded bg-emerald-600 px-3 py-1 text-white" onClick={() => resendByWhatsapp(p)}>Reenviar WhatsApp</button>
                </td>
              </tr>
            ))}
            {!payments.length ? <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>Nenhum pagamento.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Última atualização: {datetimeBR(new Date().toISOString())}</p>
    </div>
  )
}
