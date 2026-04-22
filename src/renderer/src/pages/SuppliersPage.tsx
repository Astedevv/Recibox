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
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Fornecedores</h2>
      <form onSubmit={submit} className="glass grid grid-cols-5 gap-3 rounded-2xl p-4">
        {Object.entries(form).map(([k, v]) => (
          <input key={k} className="rounded-xl border px-3 py-2" placeholder={k.toUpperCase()} value={v} onChange={(e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))} />
        ))}
        {error ? <p className="col-span-5 text-sm text-red-500">{error}</p> : null}
        <div className="col-span-5">
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">{editingId ? 'Salvar edição' : 'Cadastrar fornecedor'}</button>
          {editingId ? (
            <button type="button" className="ml-2 rounded-xl border border-slate-300 px-4 py-2 text-slate-700" onClick={cancelEdit}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Contato</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3">{s.nome}</td>
                <td className="px-4 py-3">{s.cpf_cnpj || '-'}</td>
                <td className="px-4 py-3">{s.whatsapp || s.email || '-'}</td>
                <td className="space-x-3 px-4 py-3">
                  <button className="text-blue-600" onClick={() => startEdit(s)}>
                    Editar
                  </button>
                  <button className="text-red-600" onClick={() => removeSupplier(s)}>
                    Apagar
                  </button>
                </td>
              </tr>
            ))}
            {!items.length ? <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>Nenhum fornecedor cadastrado.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
