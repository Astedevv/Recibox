import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { currencyBRL } from '@/lib/utils'
import { supabase, type ConfirmationPreview } from '@/lib/supabase'

const localIsoDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const humanDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function ConfirmReceiptPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [preview, setPreview] = useState<ConfirmationPreview | null>(null)
  const [message, setMessage] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signerDocument, setSignerDocument] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerPhone, setSignerPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const isScheduledPayment = Boolean(preview?.data_pagamento && preview.data_pagamento > localIsoDate())
  const paymentDateLabel = preview?.data_pagamento ? humanDate(preview.data_pagamento) : '-'
  const operationTypeLabel = isScheduledPayment ? `Previsto para ${paymentDateLabel}` : 'Execução imediata'

  useEffect(() => {
    const loadPreview = async () => {
      if (!token) {
        setPreviewLoading(false)
        return
      }
      const { data, error } = await supabase.rpc('get_payment_confirmation_preview', { p_token: token })
      if (!error && Array.isArray(data) && data.length > 0) {
        const confirmation = data[0] as ConfirmationPreview
        setPreview(confirmation)
        setSignerName(confirmation.confirmation_signer_name ?? confirmation.fornecedor_nome ?? '')
        setSignerDocument(confirmation.confirmation_signer_document ?? '')
      }
      setPreviewLoading(false)
    }
    loadPreview()
  }, [token])

  async function getPublicIp() {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal })
      clearTimeout(timeout)
      if (!response.ok) return null
      const payload = await response.json()
      return typeof payload.ip === 'string' ? payload.ip : null
    } catch {
      return null
    }
  }

  async function confirm() {
    if (!token) return
    if (!signerName.trim()) return setMessage('Informe seu nome para registrar a confirmação.')
    if (!signerDocument.trim()) return setMessage('Informe seu documento para registrar a confirmação.')
    if (!consent) return setMessage('Você precisa aceitar a declaração para concluir a confirmação.')

    setLoading(true)
    const ip = await getPublicIp()
    const userAgent = navigator.userAgent
    const metadata = {
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${window.screen.width}x${window.screen.height}`
    }
    const { data, error } = await supabase.rpc('confirm_payment_receipt', {
      p_token: token,
      p_ip: ip,
      p_user_agent: userAgent,
      p_signer_name: signerName.trim(),
      p_signer_document: signerDocument.trim(),
      p_signer_email: signerEmail.trim() || null,
      p_signer_phone: signerPhone.trim() || null,
      p_signer_metadata: metadata,
      p_consent: consent
    })
    if (error) setMessage(error.message)
    else setMessage((data as string) || (isScheduledPayment ? 'Ciência do agendamento registrada com sucesso.' : 'Confirmado com sucesso.'))
    setPreview((prev) => (prev ? {
      ...prev,
      status: 'confirmado',
      confirmation_date: new Date().toISOString(),
      confirmation_signer_name: signerName.trim(),
      confirmation_signer_document: signerDocument.trim()
    } : prev))
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-blue-500 to-orange-500 p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-soft">
        <h2 className="text-2xl font-bold text-slate-900">Confirmação de Recebimento</h2>
        {!previewLoading && preview ? (
          <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><strong>Fornecedor:</strong> {preview.fornecedor_nome}</p>
            <p><strong>Empresa pagadora:</strong> {preview.empresa_nome ?? 'ReciBox'}</p>
            <p><strong>Valor:</strong> {currencyBRL(Number(preview.valor))}</p>
            <p><strong>Descrição:</strong> {preview.descricao}</p>
            <p><strong>Tipo da operação:</strong> {operationTypeLabel}</p>
            <p><strong>Data prevista de pagamento:</strong> {paymentDateLabel}</p>
            <p><strong>Status atual:</strong> {preview.status === 'pendente' && isScheduledPayment ? 'pendente (data futura)' : preview.status}</p>
            {isScheduledPayment ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                Pagamento previsto para <strong>{paymentDateLabel}</strong>. A liquidação ocorrerá nessa data.
              </p>
            ) : null}
            {preview.confirmation_signature ? <p><strong>Assinatura:</strong> {preview.confirmation_signature}</p> : null}
            {preview.confirmation_signer_name ? <p><strong>Confirmado por:</strong> {preview.confirmation_signer_name}</p> : null}
            {preview.confirmation_signer_document ? <p><strong>Documento:</strong> {preview.confirmation_signer_document}</p> : null}
          </div>
        ) : null}
        {!previewLoading && !preview ? <p className="mt-3 text-sm text-red-600">Não foi possível localizar os dados desse token.</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Nome completo de quem confirma" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="CPF/CNPJ de quem confirma" value={signerDocument} onChange={(e) => setSignerDocument(e.target.value)} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="E-mail (opcional)" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="WhatsApp (opcional)" value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} />
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            {isScheduledPayment
              ? 'Declaro que estou ciente dos dados deste pagamento, previsto para a data informada no recibo, e autorizo o registro eletrônico desta confirmação.'
              : 'Declaro que recebi este pagamento e autorizo o registro eletrônico desta confirmação com os dados informados.'}
          </span>
        </label>
        <button onClick={confirm} disabled={loading || preview?.status === 'confirmado'} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60">
          {loading ? 'Confirmando...' : isScheduledPayment ? 'Confirmar ciência dos dados' : 'Confirmar recebimento'}
        </button>
        {message ? <p className="mt-4 text-sm">{message}</p> : null}
      </div>
    </div>
  )
}
