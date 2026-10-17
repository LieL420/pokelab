import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/StatusPill'
import { supabaseClient } from '@/lib/supabase'

export function PasswordRecoveryPage({ mode }: { mode: 'request' | 'update' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (!supabaseClient) {
      setError('O Supabase ainda não foi configurado.')
      return
    }
    setSubmitting(true)
    const result = mode === 'request'
      ? await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
      : await supabaseClient.auth.updateUser({ password })
    setSubmitting(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setMessage(mode === 'request'
      ? 'Se existir uma conta com esse email, enviaremos o link de recuperação.'
      : 'Senha atualizada. Você já pode entrar com a nova senha.')
  }

  return <div className="mx-auto max-w-md space-y-8"><div><StatusPill label="supabase auth · recuperação segura" /><h1 className="mt-5 font-display text-4xl font-black tracking-[-0.04em] text-white">{mode === 'request' ? 'Recuperar acesso.' : 'Definir nova senha.'}</h1><p className="mt-4 text-sm leading-6 text-slate-500">{mode === 'request' ? 'Informe o email da conta para receber um link seguro.' : 'Escolha uma nova senha para concluir a recuperação.'}</p></div><form className="space-y-4 rounded-2xl border border-white/10 bg-panel p-6" onSubmit={handleSubmit}>{mode === 'request' ? <label className="field-label">Email<input className="field-input" required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label> : <label className="field-label">Nova senha<input className="field-input" required minLength={6} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>}{error && <p className="text-sm text-rose-300" role="alert">{error}</p>}{message && <p className="text-sm text-emerald-300" role="status">{message}</p>}<Button className="w-full" disabled={submitting} type="submit">{submitting ? 'Processando…' : mode === 'request' ? 'Enviar link' : 'Atualizar senha'}</Button></form><p className="text-center text-sm text-slate-500"><Link className="font-semibold text-electric hover:text-white" to="/login">Voltar ao login</Link></p></div>
}
