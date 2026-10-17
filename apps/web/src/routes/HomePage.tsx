import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Orbit, Radar, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/StatusPill'
import { getHealth, type HealthResponse } from '@/lib/api'

export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getHealth(controller.signal).then(setHealth).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setHealthError(error instanceof Error ? error.message : 'Não foi possível consultar a API.')
    })
    return () => controller.abort()
  }, [])

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-panel p-7 shadow-2xl shadow-black/20 sm:p-10 lg:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-violet/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-electric/70 to-transparent" />
        <div className="relative grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <StatusPill label="Etapa 2 · base operacional" tone="success" />
            <h1 className="mt-7 max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-7xl">
              Monte times com <span className="text-electric">intenção.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              Um laboratório para pesquisar Pokémon, testar ideias e transformar seis slots em uma estratégia que faz sentido.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="md"><Link to="/pokedex">Explorar a Pokédex <ArrowRight size={16} /></Link></Button>
              <Button asChild variant="outline" size="md"><Link to="/team-builder">Abrir Team Builder</Link></Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="lab-card">
              <div className="flex items-center justify-between"><Radar className="text-electric" size={20} /><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">signal / 01</span></div>
              <p className="mt-8 text-2xl font-bold text-white">Pesquisa primeiro.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">Encontre o dado certo antes de decidir o próximo slot.</p>
            </div>
            <div className="lab-card border-violet/30 bg-violet/[0.06]">
              <div className="flex items-center justify-between"><Orbit className="text-violet" size={20} /><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">signal / 02</span></div>
              <p className="mt-8 text-2xl font-bold text-white">Pense em conjunto.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">A análise de tipos entra quando o time começar a tomar forma.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['01', 'Pokédex', 'Uma entrada para cada investigação.'],
          ['02', 'Team Builder', 'Até seis escolhas, sem ruído.'],
          ['03', 'Análise', 'Recomendações com contexto.'],
        ].map(([number, title, description]) => (
          <div className="border-t border-white/15 pt-4" key={number}>
            <span className="font-mono text-xs text-violet">{number} /</span>
            <h2 className="mt-5 font-display text-xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {health ? <CheckCircle2 className="mt-0.5 shrink-0 text-mint" size={20} /> : <ShieldCheck className="mt-0.5 shrink-0 text-slate-500" size={20} />}
          <div>
            <p className="font-semibold text-white">Conexão com a API</p>
            <p className="mt-1 text-sm text-slate-500">{health ? `${health.service} respondeu corretamente.` : healthError || 'Consultando o endpoint /api/health…'}</p>
          </div>
        </div>
        <StatusPill label={health ? 'online' : healthError ? 'indisponível' : 'verificando'} tone={health ? 'success' : healthError ? 'warning' : 'neutral'} />
      </section>
    </div>
  )
}
