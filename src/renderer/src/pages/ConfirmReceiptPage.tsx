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
    <div className="flex min-h-screen items-center justify-center bg-bg p-6 font-sans">
      <div className="w-full max-w-2xl rounded-[16px] bg-surface border border-border p-8 shadow-modal animate-slide-up">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
          <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-glow">
            <span className="material-icons-round text-[24px] text-white">draw</span>
          </div>
          <div>
            <h1 className="text-[20px] font-[800] text-white">Assinatura Digital</h1>
            <p className="text-[13px] text-text-muted font-[500]">Confirmação de recebimento</p>
          </div>
        </div>

        {!previewLoading && preview ? (
          <>
            <div className="bg-primary-light border border-border rounded-[8px] p-5 space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-text-muted font-[600] uppercase tracking-wide">Fornecedor</p>
                  <p className="text-[14px] text-white font-[500] mt-1">{preview.fornecedor_nome}</p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted font-[600] uppercase tracking-wide">Empresa Pagadora</p>
                  <p className="text-[14px] text-text-secondary mt-1">{preview.empresa_nome ?? 'ReciBox'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted font-[600] uppercase tracking-wide">Valor</p>
                  <p className="text-[18px] text-money font-[700] mt-1">{currencyBRL(Number(preview.valor))}</p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted font-[600] uppercase tracking-wide">Operação</p>
                  <p className="text-[14px] text-text-secondary mt-1">{operationTypeLabel}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-[11px] text-text-muted font-[600] uppercase tracking-wide mb-1">Descrição</p>
                <p className="text-[13px] text-text-secondary">{preview.descricao}</p>
              </div>

              {isScheduledPayment && (
                <div className="rounded-sm border border-warning/20 bg-warning-bg px-4 py-3 text-[13px] text-warning flex items-start gap-2 mt-4">
                  <span className="material-icons-round text-[18px] mt-0.5">event</span>
                  <p>Pagamento previsto para <strong>{paymentDateLabel}</strong>. A liquidação ocorrerá nessa data.</p>
                </div>
              )}

              {preview.status === 'confirmado' && (
                <div className="rounded-sm border border-success/20 bg-success-bg px-4 py-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-icons-round text-[18px] text-success">verified</span>
                    <h4 className="text-success font-[700] text-[14px]">Assinatura Registrada</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px] text-text-secondary">
                    <p><strong className="text-text">Hash:</strong> {preview.confirmation_signature}</p>
                    <p><strong className="text-text">Confirmado por:</strong> {preview.confirmation_signer_name}</p>
                    <p><strong className="text-text">Documento:</strong> {preview.confirmation_signer_document}</p>
                    <p><strong className="text-text">Data:</strong> {new Date(preview.confirmation_date!).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )}
            </div>

            {preview.status !== 'confirmado' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white text-[15px] font-[600] mb-4">Seus dados para assinatura</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] text-text-muted mb-1 font-[500]">Nome Completo *</label>
                      <input className="input-field" placeholder="Seu nome" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[12px] text-text-muted mb-1 font-[500]">CPF / CNPJ *</label>
                      <input className="input-field" placeholder="Seu documento" value={signerDocument} onChange={(e) => setSignerDocument(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[12px] text-text-muted mb-1 font-[500]">E-mail (Opcional)</label>
                      <input className="input-field" placeholder="Para receber a via" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[12px] text-text-muted mb-1 font-[500]">WhatsApp (Opcional)</label>
                      <input className="input-field" placeholder="(00) 00000-0000" value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} />
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-4 bg-primary-light border border-border rounded-sm">
                  <input 
                    type="checkbox" 
                    className="mt-0.5 w-4 h-4 rounded border-border bg-bg text-accent focus:ring-accent focus:ring-offset-0" 
                    checked={consent} 
                    onChange={(e) => setConsent(e.target.checked)} 
                  />
                  <span className="text-[13px] text-text-secondary leading-relaxed">
                    {isScheduledPayment
                      ? 'Declaro que estou ciente dos dados deste pagamento, previsto para a data informada no recibo, e autorizo o registro eletrônico desta confirmação.'
                      : 'Declaro que recebi este pagamento e autorizo o registro eletrônico desta confirmação com os dados informados, gerando uma assinatura digital vinculada ao meu IP e dispositivo.'}
                  </span>
                </label>

                <button 
                  onClick={confirm} 
                  disabled={loading || !consent || !signerName || !signerDocument} 
                  className="btn-accent w-full py-3 text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><span className="material-icons-round animate-spin-slow text-[18px]">refresh</span> Processando...</>
                  ) : (
                    <><span className="material-icons-round text-[18px]">fingerprint</span> {isScheduledPayment ? 'Confirmar Ciência' : 'Assinar Digitalmente'}</>
                  )}
                </button>
              </div>
            )}
          </>
        ) : null}

        {!previewLoading && !preview && (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-danger-bg border border-danger/20 rounded-[8px]">
            <span className="material-icons-round text-[48px] text-danger mb-3">gpp_bad</span>
            <p className="text-[15px] font-[600] text-danger">Token Inválido ou Expirado</p>
            <p className="text-[13px] text-danger/80 mt-1">Não foi possível localizar os dados desse link. Solicite um novo à empresa.</p>
          </div>
        )}

        {message && (
          <div className={`mt-6 p-4 rounded-sm border flex items-center gap-2 text-[13px] font-[500] ${preview?.status === 'confirmado' ? 'bg-success-bg border-success/20 text-success' : 'bg-danger-bg border-danger/20 text-danger'}`}>
            <span className="material-icons-round text-[18px]">
              {preview?.status === 'confirmado' ? 'check_circle' : 'error'}
            </span>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
