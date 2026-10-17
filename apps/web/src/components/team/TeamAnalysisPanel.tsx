import { AlertTriangle, Check, RefreshCw, Shield, Swords, Target, Waves } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TeamAnalysis, TeamStrategicAnalysis } from '@/types/team'
import { PokemonTypeBadge } from '@/components/pokemon/PokemonTypeBadge'

function multiplierLabel(multiplier: number) {
  return multiplier === 0 ? 'imune' : `${multiplier}×`
}

export function TeamAnalysisPanel({ analysis, loading, strategicAnalysis, strategicLoading, strategicStale, strategicError, onAnalyze }: { analysis: TeamAnalysis | null; loading: boolean; strategicAnalysis?: TeamStrategicAnalysis | null; strategicLoading?: boolean; strategicStale?: boolean; strategicError?: string | null; onAnalyze?: () => void }) {
  const profile = analysis ? teamProfile(analysis) : null
  return <section className="team-analysis-panel lab-card" aria-labelledby="analysis-title">
    <div className="flex items-start justify-between gap-3"><div><span className="page-kicker">LEITURA DO TIME</span><h2 id="analysis-title" className="mt-2 font-display text-xl font-bold text-white">Diagnóstico da composição</h2></div><span className="analysis-mark"><Target size={18} /></span></div>
    <div className="mt-4 flex flex-wrap items-center gap-2"><button className="analysis-refresh" type="button" onClick={onAnalyze} disabled={!onAnalyze || strategicLoading || !analysis}><RefreshCw size={13} className={strategicLoading ? 'animate-spin' : ''} />{strategicLoading ? 'calculando…' : strategicAnalysis ? 'aprofundar novamente' : 'aprofundar análise'}</button>{strategicStale && <span className="analysis-stale"><AlertTriangle size={13} /> formação alterada</span>}</div>
    {loading && <p className="mt-7 text-sm text-slate-500">Lendo os tipos dos espécimes…</p>}
    {!loading && !analysis && <p className="mt-7 text-sm leading-6 text-slate-500">Adicione um Pokémon para revelar tipos, fraquezas e resistências.</p>}
    {analysis && <div className="mt-6 space-y-6">
      {profile && <div className={`team-profile team-profile-${profile.tone}`}><div className="team-profile-heading"><div><p>PERFIL ATUAL</p><h3>{profile.title}</h3></div><span>{analysis.coverage.knownMembers}/6</span></div><p className="team-profile-copy">{profile.description}</p><div className="team-profile-grid"><div><span>Defesa</span><strong>{profile.defense}</strong></div><div><span>Ofensiva</span><strong>{profile.offense}</strong></div><div><span>Cobertura</span><strong>{analysis.offense.superEffectiveAgainst.length}/18</strong></div></div></div>}
      <div><p className="analysis-label">Tipos presentes</p><div className="mt-2 flex flex-wrap gap-2">{analysis.typesPresent.length ? analysis.typesPresent.map((type) => <PokemonTypeBadge key={type} type={type} />) : <span className="text-sm text-slate-600">Ainda vazio</span>}</div></div>
      <div className="analysis-divider"><Shield size={14} /><span>LEITURA DEFENSIVA</span></div>
      <AnalysisGroup icon={<Swords size={15} />} title="Vulnerabilidades" entries={analysis.weaknesses.slice(0, 6)} empty="Nenhuma fraqueza compartilhada encontrada." tone="coral" />
      <AnalysisGroup icon={<Waves size={15} />} title="Resistências" entries={analysis.resistances.slice(0, 6)} empty="Nenhuma resistência destacada ainda." tone="mint" />
      {analysis.immunities.length > 0 && <AnalysisGroup icon={<Shield size={15} />} title="Imunidades" entries={analysis.immunities} empty="" tone="violet" />}
      <OffensiveCoverage analysis={analysis} />
       <p className="analysis-footnote">{analysis.coverage.knownMembers}/6 conhecidos · {analysis.ruleset}. A leitura combina tipagem defensiva e golpes selecionados; habilidades, itens, EVs e condições de batalha não entram no diagnóstico rápido.</p>
       {strategicError && <p className="analysis-error"><AlertTriangle size={14} />{strategicError}</p>}
       {strategicAnalysis && <StrategicSummary analysis={strategicAnalysis} />}
    </div>}
  </section>
}

function teamProfile(analysis: TeamAnalysis) {
  const knownMembers = Math.max(analysis.coverage.knownMembers, 1)
  const sharedWeaknesses = analysis.weaknesses.filter((entry) => (entry.memberCount ?? 0) >= Math.max(2, Math.ceil(knownMembers / 2))).length
  const offenseRatio = analysis.offense.superEffectiveAgainst.length / 18
  const styleGap = analysis.statProfile.averageBulk - analysis.statProfile.averagePressure
  const defense = analysis.statProfile.averageBulk >= 95 && sharedWeaknesses <= 2 ? 'Alta' : analysis.statProfile.averageBulk >= 82 && sharedWeaknesses <= 3 ? 'Sólida' : 'Exposta'
  const offense = analysis.statProfile.averagePressure >= 110 ? 'Alta' : analysis.statProfile.averagePressure >= 90 ? 'Boa' : 'Controlada'
  const estimateNote = analysis.offense.source === 'types' ? ' Estimativa baseada na tipagem; o moveset deixará a leitura mais precisa.' : ''

  if (analysis.coverage.knownMembers < 3) return { title: 'Time em construção', tone: 'partial', defense, offense, description: `Ainda faltam integrantes para classificar o equilíbrio com segurança.${estimateNote}` }
  if (styleGap >= 6 || analysis.statProfile.defensiveMembers >= Math.ceil(knownMembers / 2)) return { title: 'Composição defensiva', tone: 'defense', defense, offense, description: `HP e defesas têm mais peso que a pressão imediata. A cobertura ofensiva é ${offenseRatio >= .5 ? 'ampla' : 'mais controlada'}, mas não muda o estilo defensivo do conjunto.${estimateNote}` }
  if (styleGap <= -6 || analysis.statProfile.offensiveMembers >= Math.ceil(knownMembers / 2)) return { title: 'Composição ofensiva', tone: 'offense', defense, offense, description: `Ataque e velocidade predominam sobre a capacidade de absorver dano. O time tende a buscar pressão e ritmo.${estimateNote}` }
  if (sharedWeaknesses <= 2) return { title: 'Composição equilibrada', tone: 'balanced', defense, offense, description: `Os atributos base não pendem fortemente para ataque ou defesa, e há poucas fraquezas compartilhadas.${estimateNote}` }
  return { title: 'Composição em ajuste', tone: 'mixed', defense, offense, description: `Os atributos estão distribuídos, mas as fraquezas compartilhadas ainda prejudicam o equilíbrio.${estimateNote}` }
}

function OffensiveCoverage({ analysis }: { analysis: TeamAnalysis }) {
  const usingMoves = analysis.offense.source === 'moves'
  return <div className="analysis-offense"><div className="analysis-divider"><Target size={14} /><span>LEITURA OFENSIVA</span></div><div className="analysis-group-title analysis-mint"><Swords size={15} /><span>{usingMoves ? 'Cobertura dos golpes' : 'Potencial pela tipagem'}</span></div><p className="analysis-subcopy">{usingMoves ? `${analysis.offense.selectedMoves} ${analysis.offense.selectedMoves === 1 ? 'golpe ofensivo selecionado' : 'golpes ofensivos selecionados'}` : 'Estimativa automática pelos tipos dos integrantes'} · vantagem contra {analysis.offense.superEffectiveAgainst.length} de 18 tipos.</p><div className="mt-3 flex flex-wrap gap-2">{analysis.offense.superEffectiveAgainst.map((type) => <PokemonTypeBadge compact key={type} type={type} />)}</div>{analysis.offense.uncoveredTypes.length > 0 && <p className="analysis-offense-gap">Sem vantagem direta contra {analysis.offense.uncoveredTypes.length} tipos.{!usingMoves && ' Selecione golpes para refinar.'}</p>}</div>
}

function StrategicSummary({ analysis }: { analysis: TeamStrategicAnalysis }) {
  const needs = analysis.needs.slice(0, 3)
  return <div className="strategic-summary">
    <div className="strategic-summary-head"><div><p className="analysis-label">Motor estratégico</p><p className="analysis-subcopy">{analysis.team.size}/6 integrantes · {analysis.offense.moves.length} golpes analisados</p></div><span className="analysis-ruleset"><Check size={11} /> {analysis.ruleset.id}</span></div>
    <div className="strategic-stat-grid"><div><strong>{analysis.defense.sharedWeaknesses.length}</strong><span>fraquezas<br />compartilhadas</span></div><div><strong>{analysis.offense.superEffectiveAgainst.length}</strong><span>tipos com<br />cobertura</span></div><div><strong>{analysis.needs.length}</strong><span>necessidades<br />identificadas</span></div></div>
    <div className="strategic-section"><div className="analysis-group-title analysis-coral"><Swords size={15} /><span>alertas defensivos</span></div>{analysis.defense.alerts.length ? <ul>{analysis.defense.alerts.slice(0, 2).map((alert) => <li key={alert}>{alert}</li>)}</ul> : <p className="strategic-empty">Nenhum alerta de alta exposição nesta leitura.</p>}</div>
    <div className="strategic-section"><div className="analysis-group-title analysis-mint"><Target size={15} /><span>lacunas ofensivas</span></div>{analysis.offense.uncoveredTypes.length ? <div className="strategic-type-list">{analysis.offense.uncoveredTypes.slice(0, 8).map((type) => <PokemonTypeBadge compact key={type} type={type} />)}</div> : <p className="strategic-empty">Os 18 tipos têm alguma cobertura super efetiva.</p>}</div>
    <div className="strategic-section"><div className="analysis-group-title analysis-violet"><Waves size={15} /><span>próximas atenções</span></div>{needs.length ? <div className="strategic-needs">{needs.map((need) => <div key={need.id}><span className={`need-dot need-${need.priority}`} /><p>{need.description}</p></div>)}</div> : <p className="strategic-empty">Nenhuma necessidade objetiva encontrada.</p>}</div>
    <p className="analysis-footnote">Heurísticas informativas. Não consideram habilidades, itens, EVs, clima ou dano real.</p>
  </div>
}

function AnalysisGroup({ icon, title, entries, empty, tone }: { icon: ReactNode; title: string; entries: TeamAnalysis['weaknesses']; empty: string; tone: 'coral' | 'mint' | 'violet' }) {
  return <div><div className={`analysis-group-title analysis-${tone}`}>{icon}<span>{title}</span></div>{entries.length ? <div className="mt-2 grid gap-2">{entries.map((entry) => <div className="analysis-row" key={entry.type}><PokemonTypeBadge compact type={entry.type} /><span>{multiplierLabel(entry.multiplier)}</span>{entry.memberCount !== undefined && <small>{entry.memberCount} {entry.memberCount === 1 ? 'membro' : 'membros'}</small>}</div>)}</div> : <p className="mt-2 text-xs text-slate-600">{empty}</p>}</div>
}
