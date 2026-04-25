import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar integração completa.')
}

export const supabase = createClient(supabaseUrl ?? 'https://example.invalid', supabaseAnonKey ?? 'invalid')

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Supplier = {
  id: string
  nome: string
  cpf_cnpj: string | null
  whatsapp: string | null
  email: string | null
  pix: string | null
}

export type Payment = {
  id: string
  fornecedor_id: string
  valor: number
  descricao: string
  obra: string | null
  forma_pagamento: string
  data_pagamento: string
  status: 'pendente' | 'confirmado'
  confirmation_token: string
  share_link: string | null
  pdf_url: string | null
  pdf_path: string | null
  confirmation_date: string | null
  confirmation_signature: string | null
  confirmation_signer_name: string | null
  confirmation_signer_document: string | null
}

export type ConfirmationPreview = {
  fornecedor_nome: string
  empresa_nome: string | null
  valor: number
  descricao: string
  data_pagamento: string
  status: 'pendente' | 'confirmado'
  confirmation_date: string | null
  confirmation_signature: string | null
  confirmation_signer_name: string | null
  confirmation_signer_document: string | null
}

export type CompanySettings = {
  id: string
  empresa_nome: string
  cnpj: string | null
  endereco: string | null
  logo_url: string | null
  rodape: string | null
  tema: string | null
  confirmation_base_url: string | null
}
