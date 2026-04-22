import { createRequire } from 'node:module'
import { createClient } from '@supabase/supabase-js'
import {
  GenerateReceiptPayloadSchema,
  IPC_CHANNELS,
  OpenEmailPayloadSchema,
  ShareMessagePayloadSchema,
  type GenerateReceiptResult,
  type ShareMessageResult
} from '@shared/ipc'
import { buildReceiptHtml, htmlToPdfBuffer } from './pdf'

const require = createRequire(import.meta.url)
const { ipcMain, shell } = require('electron') as typeof import('electron')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const CONFIRMATION_BASE_URL = process.env.VITE_CONFIRMATION_BASE_URL || 'recibox://confirm'

const getAuthClient = (accessToken: string) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  })
}

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.getEnv, () => ({
    confirmationBaseUrl: CONFIRMATION_BASE_URL
  }))

  ipcMain.handle(IPC_CHANNELS.generateReceipt, async (_event, payload): Promise<GenerateReceiptResult> => {
    const input = GenerateReceiptPayloadSchema.parse(payload)
    const html = buildReceiptHtml(input)
    const pdfBuffer = await htmlToPdfBuffer(html)
    const path = `${input.userId}/${input.payment.id}-${Date.now()}.pdf`
    const supabase = getAuthClient(input.accessToken)
    const upload = await supabase.storage
      .from('receipts')
      .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: false })
    if (upload.error) throw new Error(upload.error.message)
    const url = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl
    return {
      pdfPath: path,
      pdfUrl: url,
      message: 'Recibo gerado e enviado ao Storage com sucesso.'
    }
  })

  ipcMain.handle(IPC_CHANNELS.buildShareMessage, async (_event, payload): Promise<ShareMessageResult> => {
    const input = ShareMessagePayloadSchema.parse(payload)
    const link = `${CONFIRMATION_BASE_URL.replace(/\/$/, '')}/${input.confirmationToken}`
    const value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(input.valor)
    const whatsappMessage =
      `Olá, ${input.fornecedorNome}! Pagamento realizado no valor de ${value}.` +
      `\nDescrição: ${input.descricao}\nConfirme o recebimento: ${link}`
    const emailSubject = 'Confirmação de recebimento de pagamento'
    const emailMessage = `Olá, ${input.fornecedorNome}.\n\n` +
      `Informamos que o seu pagamento no valor de ${value} foi registrado com sucesso.\n` +
      `Descrição: ${input.descricao}\n\n` +
      `Para confirmar o recebimento, acesse o link abaixo:\n${link}\n\n` +
      'Atenciosamente,\nEquipe Financeira'
    return { link, whatsappMessage, emailMessage, emailSubject }
  })

  ipcMain.handle(IPC_CHANNELS.openEmailClient, async (_event, payload): Promise<{ mailto: string }> => {
    const input = OpenEmailPayloadSchema.parse(payload)
    const mailto = `mailto:${encodeURIComponent(input.to)}?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(input.body)}`
    await shell.openExternal(mailto)
    return { mailto }
  })
}
