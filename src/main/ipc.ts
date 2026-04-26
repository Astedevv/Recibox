import { createRequire } from 'node:module'
import { createClient } from '@supabase/supabase-js'
import {
  GenerateSignedReceiptPayloadSchema,
  GenerateReceiptPayloadSchema,
  IPC_CHANNELS,
  OpenEmailPayloadSchema,
  ShareMessagePayloadSchema,
  type GenerateReceiptResult,
  type ShareMessageResult
} from '@shared/ipc'
import { buildReceiptHtml, buildSignedReceiptHtml, htmlToPdfBuffer } from './pdf'

const require = createRequire(import.meta.url)
const { ipcMain, shell } = require('electron') as typeof import('electron')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const DEFAULT_CONFIRMATION_BASE_URL = 'https://recibox-sigma.vercel.app'
const CONFIRMATION_BASE_URL = process.env.VITE_CONFIRMATION_BASE_URL || DEFAULT_CONFIRMATION_BASE_URL

const normalizeConfirmationBaseUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim().replace(/\/$/, '')
  if (!trimmed) return `${DEFAULT_CONFIRMATION_BASE_URL}/#/confirm`
  if (trimmed.startsWith('recibox://')) return `${DEFAULT_CONFIRMATION_BASE_URL}/#/confirm`
  if (trimmed.includes('#/confirm')) return trimmed
  if (trimmed.endsWith('/confirm')) return trimmed
  return `${trimmed}/#/confirm`
}

const buildConfirmationLink = (token: string) => {
  const base = normalizeConfirmationBaseUrl(CONFIRMATION_BASE_URL)
  return `${base.replace(/\/$/, '')}/${token}`
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const humanDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const compact = (value?: string | null) => (value && value.trim() ? value.trim() : 'Não informado')

const buildShareBody = (params: {
  fornecedorNome: string
  fornecedorDocumento?: string | null
  fornecedorPix?: string | null
  valor: number
  descricao: string
  obra?: string | null
  formaPagamento?: string | null
  dataPagamento: string
  empresaNome: string
  empresaCnpj?: string | null
  empresaEndereco?: string | null
  link: string
}) => {
  const lines = [
    `Olá, ${params.fornecedorNome}!`,
    '',
    `Segue abaixo o resumo formal do pagamento registrado:`,
    '',
    `Empresa: ${params.empresaNome}`,
    `CNPJ: ${compact(params.empresaCnpj)}`,
    `Endereço: ${compact(params.empresaEndereco)}`,
    `Fornecedor: ${params.fornecedorNome}`,
    `Documento do fornecedor: ${compact(params.fornecedorDocumento)}`,
    `Chave PIX: ${compact(params.fornecedorPix)}`,
    `Valor: ${money(params.valor)}`,
    `Data do pagamento: ${humanDate(params.dataPagamento)}`,
    `Forma de pagamento: ${compact(params.formaPagamento)}`,
    `Obra/Projeto: ${compact(params.obra)}`,
    `Descrição: ${params.descricao}`,
    '',
    'Confirme o recebimento acessando o link abaixo:',
    params.link,
    '',
    'Após a confirmação, o recibo assinado ficará disponível automaticamente.',
    '',
    'Atenciosamente,',
    `Equipe ${params.empresaNome}`
  ]
  return lines.join('\n')
}

const getAuthClient = (accessToken: string) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  })
}

async function uploadPdf(accessToken: string, path: string, pdfBuffer: Buffer): Promise<GenerateReceiptResult> {
  const supabase = getAuthClient(accessToken)
  const upload = await supabase.storage
    .from('receipts')
    .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true })
  if (upload.error) throw new Error(upload.error.message)
  const url = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl
  return {
    pdfPath: path,
    pdfUrl: url,
    message: 'Recibo gerado e enviado ao Storage com sucesso.'
  }
}

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.getEnv, () => ({
    confirmationBaseUrl: normalizeConfirmationBaseUrl(CONFIRMATION_BASE_URL)
  }))

  ipcMain.handle(IPC_CHANNELS.generateReceipt, async (_event, payload): Promise<GenerateReceiptResult> => {
    const input = GenerateReceiptPayloadSchema.parse(payload)
    const html = buildReceiptHtml(input)
    const pdfBuffer = await htmlToPdfBuffer(html)
    const path = `${input.userId}/${input.payment.id}-${Date.now()}.pdf`
    return uploadPdf(input.accessToken, path, pdfBuffer)
  })

  ipcMain.handle(IPC_CHANNELS.generateSignedReceipt, async (_event, payload): Promise<GenerateReceiptResult> => {
    const input = GenerateSignedReceiptPayloadSchema.parse(payload)
    const html = buildSignedReceiptHtml(input)
    const pdfBuffer = await htmlToPdfBuffer(html)
    const path = `${input.userId}/${input.payment.id}-signed-${Date.now()}.pdf`
    return uploadPdf(input.accessToken, path, pdfBuffer)
  })

  ipcMain.handle(IPC_CHANNELS.buildShareMessage, async (_event, payload): Promise<ShareMessageResult> => {
    const input = ShareMessagePayloadSchema.parse(payload)
    const base = normalizeConfirmationBaseUrl(input.confirmationBaseUrl ?? CONFIRMATION_BASE_URL)
    const link = `${base.replace(/\/$/, '')}/${input.confirmationToken}`
    const whatsappMessage = buildShareBody({ ...input, link })
    const emailSubject = `Confirmação de recebimento - ${input.empresaNome}`
    const emailMessage = whatsappMessage
    return { link, whatsappMessage, emailMessage, emailSubject }
  })

  ipcMain.handle(IPC_CHANNELS.openEmailClient, async (_event, payload): Promise<{ mailto: string }> => {
    const input = OpenEmailPayloadSchema.parse(payload)
    const mailto = `mailto:${encodeURIComponent(input.to)}?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(input.body)}`
    await shell.openExternal(mailto)
    return { mailto }
  })
}
