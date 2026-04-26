import { type FormEvent, useEffect, useState } from 'react'
import { z } from 'zod'
import { supabase, type Supplier } from '@/lib/supabase'

const schema = z.object({
  nome: z.string().min(2),
  cpf_cnpj: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  pix: z.string().optional()
})

const initial = { nome: '', cpf_cnpj: '', whatsapp: '', email: '', pix: '' }

export function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([])
  const [form, setForm] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    setItems((data as Supplier[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = schema.safeParse(form)
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
    setError(null)
    const payload = {
      nome: form.nome,
      cpf_cnpj: form.cpf_cnpj || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      pix: form.pix || null
    }
    if (editingId) {
      const { error: updateError } = await supabase.from('fornecedores').update(payload).eq('id', editingId)
      if (updateError) return setError(updateError.message)
    } else {
      const { error: insertError } = await supabase.from('fornecedores').insert(payload)
      if (insertError) return setError(insertError.message)
    }
    setForm(initial)
    setEditingId(null)
    load()
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id)
    setForm({
      nome: supplier.nome,
      cpf_cnpj: supplier.cpf_cnpj ?? '',
      whatsapp: supplier.whatsapp ?? '',
      email: supplier.email ?? '',
      pix: supplier.pix ?? ''
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(initial)
    setError(null)
  }

  async function removeSupplier(supplier: Supplier) {
    const ok = window.confirm(`Deseja apagar o fornecedor "${supplier.nome}"?`)
    if (!ok) return
    const { error: deleteError } = await supabase.from('fornecedores').delete().eq('id', supplier.id)
    if (deleteError) {
      alert('Não foi possível apagar este fornecedor. Remova/ajuste pagamentos vinculados antes.')
      return
    }
    if (editingId === supplier.id) cancelEdit()
    load()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-white">Fornecedores</h1>
        <p className="mt-1 text-text-muted text-[13px]">Gerencie os dados de contato e pagamento dos fornecedores.</p>
      </div>
      
      <form onSubmit={submit} className="bg-surface border border-border rounded-[12px] p-6 shadow-card">
        <h3 className="text-white mb-4 flex items-center gap-2">
          <span className="material-icons-round text-accent text-[18px]">
            {editingId ? 'edit' : 'add_circle'}
          </span>
          {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Nome *</label>
            <input className="input-field" placeholder="Ex: João da Silva" value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">CPF/CNPJ</label>
            <input className="input-field" placeholder="000.000.000-00" value={form.cpf_cnpj} onChange={(e) => setForm((prev) => ({ ...prev, cpf_cnpj: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">WhatsApp</label>
            <input className="input-field" placeholder="(00) 00000-0000" value={form.whatsapp} onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">E-mail</label>
            <input className="input-field" placeholder="email@exemplo.com" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Chave PIX</label>
            <input className="input-field" placeholder="Chave PIX" value={form.pix} onChange={(e) => setForm((prev) => ({ ...prev, pix: e.target.value }))} />
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 rounded-sm bg-danger-bg border border-danger/20 flex items-center gap-2">
            <span className="material-icons-round text-danger text-[16px]">error_outline</span>
            <p className="text-[12px] text-danger font-[500]">{error}</p>
          </div>
        )}
        
        <div className="mt-6 flex items-center gap-3">
          <button className="btn-accent flex items-center gap-2">
            <span className="material-icons-round text-[16px]">save</span>
            {editingId ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
          </button>
          {editingId && (
            <button type="button" className="btn-ghost flex items-center gap-2" onClick={cancelEdit}>
              <span className="material-icons-round text-[16px]">close</span>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-surface border border-border rounded-[12px] overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header px-5 py-4 w-1/3">Fornecedor</th>
                <th className="table-header px-5 py-4">Documento / PIX</th>
                <th className="table-header px-5 py-4">Contato</th>
                <th className="table-header px-5 py-4 w-[100px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((s) => (
                <tr key={s.id} className="group hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-lighter flex items-center justify-center text-text-muted text-[14px] font-bold">
                        {s.nome.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-[500] text-[13px]">{s.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-text-secondary">
                    <div>{s.cpf_cnpj || <span className="text-text-muted italic">Sem doc.</span>}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{s.pix ? `PIX: ${s.pix}` : ''}</div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-text-secondary">
                    <div className="flex items-center gap-1">
                      <span className="material-icons-round text-[14px] text-text-muted">phone</span>
                      {s.whatsapp || '-'}
                    </div>
                    {s.email && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
                        <span className="material-icons-round text-[12px]">mail</span>
                        {s.email}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-accent hover:bg-accent-glow flex items-center justify-center transition-colors"
                        onClick={() => startEdit(s)}
                        title="Editar"
                      >
                        <span className="material-icons-round text-[16px]">edit</span>
                      </button>
                      <button 
                        className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-danger hover:bg-danger-bg flex items-center justify-center transition-colors"
                        onClick={() => removeSupplier(s)}
                        title="Apagar"
                      >
                        <span className="material-icons-round text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="px-5 py-12 text-center text-text-muted text-[13px]" colSpan={4}>
                    <span className="material-icons-round text-[32px] text-primary-lighter block mb-2">domain_disabled</span>
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
