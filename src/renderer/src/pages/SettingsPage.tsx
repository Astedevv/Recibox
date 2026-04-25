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
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Configurações da empresa</h2>
      <form onSubmit={save} className="glass grid max-w-3xl grid-cols-2 gap-3 rounded-2xl p-5">
        <input className="rounded-xl border px-3 py-2" placeholder="Nome da empresa" value={form.empresa_nome} onChange={(e) => setForm((f) => ({ ...f, empresa_nome: e.target.value }))} />
        <input className="rounded-xl border px-3 py-2" placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} />
        <input className="col-span-2 rounded-xl border px-3 py-2" placeholder="Endereço" value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
        <input className="col-span-2 rounded-xl border px-3 py-2" placeholder="URL da logo" value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} />
        <input className="col-span-2 rounded-xl border px-3 py-2" placeholder="Rodapé" value={form.rodape} onChange={(e) => setForm((f) => ({ ...f, rodape: e.target.value }))} />
        <input className="col-span-2 rounded-xl border px-3 py-2" placeholder="URL pública de confirmação" value={form.confirmation_base_url} onChange={(e) => setForm((f) => ({ ...f, confirmation_base_url: e.target.value }))} />
        <input className="rounded-xl border px-3 py-2" placeholder="Tema" value={form.tema} onChange={(e) => setForm((f) => ({ ...f, tema: e.target.value }))} />
        <div className="col-span-2">
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Salvar</button>
        </div>
      </form>
    </div>
  )
}
