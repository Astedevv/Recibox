import { type FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 font-sans">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[16px] bg-surface border border-border p-8 shadow-modal animate-slide-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-glow">
            <span className="material-icons-round text-white">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-[20px] font-[800] text-white">ReciBox</h1>
            <p className="text-[12px] text-text-muted font-[500]">Acesso ao sistema</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">E-mail</label>
            <input className="input-field" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-[12px] text-text-muted mb-1 font-[500]">Senha</label>
            <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>
        
        {error ? (
          <div className="mt-4 p-3 rounded-sm bg-danger-bg border border-danger/20 flex items-start gap-2">
            <span className="material-icons-round text-danger text-[16px]">error_outline</span>
            <p className="text-[12px] text-danger font-[500]">{error}</p>
          </div>
        ) : null}
        
        <button disabled={loading} className="btn-accent w-full mt-6 disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <span className="material-icons-round animate-spin-slow text-[18px]">refresh</span>
              Entrando...
            </>
          ) : (
            <>
              Entrar
              <span className="material-icons-round text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
