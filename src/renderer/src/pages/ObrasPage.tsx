import { type FormEvent, useEffect, useState } from 'react'
import { z } from 'zod'
import { supabase, type Obra } from '@/lib/supabase'

const schema = z.object({
  nome: z.string().min(2),
})

const initial = { nome: '' }

export function ObrasPage() {
  const [items, setItems] = useState<Obra[]>([])
  const [form, setForm] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const { data } = await supabase.from('obras').select('*').order('nome')
    setItems((data as Obra[]) ?? [])
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
    }
    if (editingId) {
      const { error: updateError } = await supabase.from('obras').update(payload).eq('id', editingId)
      if (updateError) return setError(updateError.message)
    } else {
      const { error: insertError } = await supabase.from('obras').insert(payload)
      if (insertError) return setError(insertError.message)
    }
    setForm(initial)
    setEditingId(null)
    load()
  }

  function startEdit(obra: Obra) {
    setEditingId(obra.id)
    setForm({
      nome: obra.nome,
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(initial)
    setError(null)
  }

  async function removeObra(obra: Obra) {
    const ok = window.confirm(`Deseja apagar a obra "${obra.nome}"?`)
    if (!ok) return
    const { error: deleteError } = await supabase.from('obras').delete().eq('id', obra.id)
    if (deleteError) {
      alert('Não foi possível apagar esta obra.')
      return
    }
    if (editingId === obra.id) cancelEdit()
    load()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-white">Obras</h1>
        <p className="mt-1 text-text-muted text-[13px]">Gerencie as obras cadastradas no sistema.</p>
      </div>
      
      <form onSubmit={submit} className="bg-surface border border-border rounded-[12px] p-6 shadow-card">
        <h3 className="text-white mb-4 flex items-center gap-2">
          <span className="material-icons-round text-accent text-[18px]">
            {editingId ? 'edit' : 'add_circle'}
          </span>
          {editingId ? 'Editar Obra' : 'Nova Obra'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Nome da Obra *</label>
            <input className="input-field" placeholder="Ex: Residencial Alphaville" value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} required />
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
            {editingId ? 'Salvar Alterações' : 'Cadastrar Obra'}
          </button>
          {editingId && (
            <button type="button" className="btn-ghost flex items-center gap-2" onClick={cancelEdit}>
              <span className="material-icons-round text-[16px]">close</span>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-surface border border-border rounded-[12px] overflow-hidden shadow-card max-w-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header px-5 py-4 w-2/3">Nome da Obra</th>
                <th className="table-header px-5 py-4 w-[100px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((s) => (
                <tr key={s.id} className="group hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-lighter flex items-center justify-center text-text-muted text-[14px] font-bold">
                        <span className="material-icons-round text-[16px]">apartment</span>
                      </div>
                      <span className="text-white font-[500] text-[13px]">{s.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-accent hover:bg-accent-glow flex items-center justify-center transition-colors"
                        onClick={() => startEdit(s)}
                        title="Editar"
                      >
                        <span className="material-icons-round text-[16px]">edit</span>
                      </button>
                      <button 
                        type="button"
                        className="w-8 h-8 rounded-sm bg-primary-light text-text-secondary hover:text-danger hover:bg-danger-bg flex items-center justify-center transition-colors"
                        onClick={() => removeObra(s)}
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
                  <td className="px-5 py-12 text-center text-text-muted text-[13px]" colSpan={2}>
                    <span className="material-icons-round text-[32px] text-primary-lighter block mb-2">domain_disabled</span>
                    Nenhuma obra cadastrada.
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
