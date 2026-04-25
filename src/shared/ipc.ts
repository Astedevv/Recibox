import { z } from 'zod'

export const SupplierSnapshotSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  cpf_cnpj: z.string().nullable(),
  pix: z.string().nullable()
})

export const CompanySettingsSnapshotSchema = z.object({
  empresa_nome: z.string(),
  cnpj: z.string().nullable(),
  endereco: z.string().nullable(),
  logo_url: z.string().nullable(),
  rodape: z.string().nullable()
})

export const PaymentSnapshotSchema = z.object({
  id: z.string().uuid(),
  valor: z.number().positive(),
  descricao: z.string(),
  forma_pagamento: z.string(),
  data_pagamento: z.string(),
  obra: z.string().nullable(),
  confirmation_token: z.string(),
  fornecedor_id: z.string().uuid()
})

export const GenerateReceiptPayloadSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.string().uuid(),
  supplier: SupplierSnapshotSchema,
  company: CompanySettingsSnapshotSchema,
  payment: PaymentSnapshotSchema
})

export type GenerateReceiptPayload = z.infer<typeof GenerateReceiptPayloadSchema>

export const ConfirmationSnapshotSchema = z.object({
  confirmation_date: z.string().nullable(),
  confirmation_signature: z.string().nullable(),
  confirmation_signer_name: z.string().nullable(),
  confirmation_signer_document: z.string().nullable()
})

export const GenerateSignedReceiptPayloadSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.string().uuid(),
  supplier: SupplierSnapshotSchema,
  company: CompanySettingsSnapshotSchema,
  payment: PaymentSnapshotSchema.extend({
    confirmation_date: z.string().nullable(),
    confirmation_signature: z.string().nullable(),
    confirmation_signer_name: z.string().nullable(),
    confirmation_signer_document: z.string().nullable()
  })
})

export type GenerateSignedReceiptPayload = z.infer<typeof GenerateSignedReceiptPayloadSchema>

export const ShareMessagePayloadSchema = z.object({
  fornecedorNome: z.string(),
  fornecedorDocumento: z.string().nullable().optional(),
  fornecedorPix: z.string().nullable().optional(),
  valor: z.number(),
  descricao: z.string(),
  obra: z.string().nullable().optional(),
  formaPagamento: z.string().nullable().optional(),
  dataPagamento: z.string(),
  empresaNome: z.string(),
  empresaCnpj: z.string().nullable().optional(),
  empresaEndereco: z.string().nullable().optional(),
  confirmationToken: z.string(),
  confirmationBaseUrl: z.string().optional()
})

export type ShareMessagePayload = z.infer<typeof ShareMessagePayloadSchema>

export const OpenEmailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1)
})

export type OpenEmailPayload = z.infer<typeof OpenEmailPayloadSchema>

export type GenerateReceiptResult = {
  pdfUrl: string
  pdfPath: string
  message: string
}

export type ShareMessageResult = {
  link: string
  whatsappMessage: string
  emailMessage: string
  emailSubject: string
}

export const IPC_CHANNELS = {
  generateReceipt: 'receipt:generate-and-upload',
  generateSignedReceipt: 'receipt:generate-signed-and-upload',
  buildShareMessage: 'share:build-message',
  getEnv: 'app:get-env',
  openEmailClient: 'share:open-email-client'
} as const
