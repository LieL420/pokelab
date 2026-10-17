import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/StatusPill'
import { supabaseClient } from '@/lib/supabase'

type AuthPageProps = { mode: 'login' | 'register' }

export function AuthPage({ mode }: AuthPageProps) {
  const isLogin = mode === 'login'
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!supabaseClient) {
      setError('O Supabase ainda não foi configurado. Copie o .env.example e informe a URL e a chave anon.')
      return
    }

    setSubmitting(true)
    const result = isLogin
      ? await supabaseClient.auth.signInWithPassword({ email, password })
      : await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() || undefined } },
        })
    setSubmitting(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (isLogin || result.data.session) {
      navigate('/teams')
      return
    }

    setMessage('Cadastro criado. Confirme seu email para ativar o acesso.')
  }

  return <div className="mx-auto max-w-md space-y-8"><div><StatusPill label="supabase auth · conectado ao fluxo" /><h1 className="mt-5 font-display text-4xl font-black tracking-[-0.04em] text-white">{isLogin ? 'Voltar ao laboratório.' : 'Criar acesso.'}</h1><p className="mt-4 text-sm leading-6 text-slate-500">Sua senha é processada pelo Supabase Auth e nunca é persistida pelo PokéLab.</p></div><form className="space-y-4 rounded-2xl border border-white/10 bg-panel p-6" onSubmit={handleSubmit}><label className="field-label">Email<input className="field-input" required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></label>{!isLogin && <label className="field-label">Nome de campo<input className="field-input" maxLength={80} autoComplete="name" type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Como devemos chamar você?" /></label>}<label className="field-label">Senha<input className="field-input" required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>{isLogin && <div className="text-right"><Link className="text-xs font-semibold text-electric hover:text-white" to="/forgot-password">Esqueci minha senha</Link></div>}{error && <p className="text-sm text-rose-300" role="alert">{error}</p>}{message && <p className="text-sm text-emerald-300" role="status">{message}</p>}<Button className="w-full" disabled={submitting} type="submit">{submitting ? 'Processando…' : isLogin ? 'Entrar' : 'Criar conta'}</Button></form><p className="text-center text-sm text-slate-500">{isLogin ? 'Ainda não tem acesso? ' : 'Já tem uma conta? '}<Link className="font-semibold text-electric hover:text-white" to={isLogin ? '/register' : '/login'}>{isLogin ? 'Criar conta' : 'Entrar'}</Link></p></div>
}
