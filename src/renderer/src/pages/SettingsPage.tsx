import { type FormEvent, useEffect, useState } from 'react'
import { z } from 'zod'
import { supabase, type CompanySettings } from '@/lib/supabase'

const schema = z.object({
  empresa_nome: z.string().min(2),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  rodape: z.string().optional(),
  tema: z.string().optional(),
  confirmation_base_url: z.string().url().optional().or(z.literal(''))
})

export function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [form, setForm] = useState({
    empresa_nome: '',
    cnpj: '',
    endereco: '',
    logo_url: '',
    rodape: '',
    tema: 'blue-orange',
    confirmation_base_url: ''
  })

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('*').limit(1).maybeSingle()
      if (data) {
        const row = data as CompanySettings
        setSettings(row)
        setForm({
          empresa_nome: row.empresa_nome,
          cnpj: row.cnpj ?? '',
          endereco: row.endereco ?? '',
          logo_url: row.logo_url ?? '',
          rodape: row.rodape ?? '',
          tema: row.tema ?? 'blue-orange',
          confirmation_base_url: row.confirmation_base_url ?? ''
        })
      }
    }
    load()
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    const parsed = schema.safeParse(form)
    if (!parsed.success) return alert(parsed.error.issues[0]?.message)
    const payload = {
      empresa_nome: form.empresa_nome,
      cnpj: form.cnpj || null,
      endereco: form.endereco || null,
      logo_url: form.logo_url || null,
      rodape: form.rodape || null,
      tema: form.tema,
      confirmation_base_url: form.confirmation_base_url || null
    }
    if (settings) {
      await supabase.from('configuracoes').update(payload).eq('id', settings.id)
    } else {
      await supabase.from('configuracoes').insert(payload)
    }
    alert('Configurações salvas.')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-white">Configurações</h1>
        <p className="mt-1 text-text-muted text-[13px]">Configure os dados da sua empresa e do recibo.</p>
      </div>
      
      <form onSubmit={save} className="bg-surface border border-border shadow-card max-w-3xl rounded-[12px] p-6 space-y-6">
        <div>
          <h3 className="text-white flex items-center gap-2 border-b border-border pb-3 mb-4">
            <span className="material-icons-round text-accent text-[18px]">business</span>
            Dados da Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-text-muted mb-1 font-[500]">Nome da Empresa *</label>
              <input required className="input-field" placeholder="Razão Social" value={form.empresa_nome} onChange={(e) => setForm((f) => ({ ...f, empresa_nome: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[12px] text-text-muted mb-1 font-[500]">CNPJ</label>
              <input className="input-field" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] text-text-muted mb-1 font-[500]">Endereço Completo</label>
              <input className="input-field" placeholder="Rua, Número, Bairro, Cidade - UF" value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-white flex items-center gap-2 border-b border-border pb-3 mb-4">
            <span className="material-icons-round text-accent text-[18px]">brush</span>
            Personalização do Recibo
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[12px] text-text-muted mb-1 font-[500]">URL da Logo</label>
              <input className="input-field" placeholder="https://exemplo.com/logo.png" value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} />
              {form.logo_url && (
                <div className="mt-2 p-2 bg-primary-light border border-border rounded-sm inline-block">
                  <img src={form.logo_url} alt="Logo" className="h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
            <div>
              <label className="block text-[12px] text-text-muted mb-1 font-[500]">Texto do Rodapé</label>
              <input className="input-field" placeholder="Texto exibido no final do PDF" value={form.rodape} onChange={(e) => setForm((f) => ({ ...f, rodape: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[12px] text-text-muted mb-1 font-[500]">URL Base de Confirmação</label>
              <input className="input-field" placeholder="https://app.recibox.com.br" value={form.confirmation_base_url} onChange={(e) => setForm((f) => ({ ...f, confirmation_base_url: e.target.value }))} />
              <p className="text-[11px] text-text-muted mt-1">Usada para gerar os links de assinatura enviados no WhatsApp.</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button className="btn-accent flex items-center gap-2">
            <span className="material-icons-round text-[16px]">save</span>
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  )
}
