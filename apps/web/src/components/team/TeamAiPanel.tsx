import { AlertTriangle, Check, Plus, RefreshCw, Sparkles, WandSparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PokemonTypeBadge } from '@/components/pokemon/PokemonTypeBadge'
import { analyzePreviewWithAi, analyzeTeamWithAi, recommendMovesetPreviewWithAi, recommendMovesetWithAi, recommendPokemonPreviewWithAi, recommendPokemonWithAi, type AnalysisPreviewInput } from '@/lib/api'
import type { AiMovesetResponse, AiPokemonRecommendation, AiTeamAnalysis, TeamEditorState } from '@/types/team'

type Props = { editor: TeamEditorState; onApplyPokemon: (recommendation: AiPokemonRecommendation) => void; onApplyMoveset: (position: number, recommendation: AiMovesetResponse) => void }

function previewInput(editor: TeamEditorState): AnalysisPreviewInput {
  return { name: editor.name, format: editor.format, pokemon: editor.pokemon.map((member) => ({ position: member.position, speciesId: member.speciesId, speciesSlug: member.speciesSlug, formId: member.formId, formSlug: member.formSlug, moves: member.moves.map(({ slot, moveId, moveSlug }) => ({ slot, moveId, moveSlug })) })) }
}

export function TeamAiPanel({ editor, onApplyPokemon, onApplyMoveset }: Props) {
  const [analysis, setAnalysis] = useState<AiTeamAnalysis | null>(null)
  const [pokemonResult, setPokemonResult] = useState<Awaited<ReturnType<typeof recommendPokemonWithAi>>['data'] | null>(null)
  const [movesetResult, setMovesetResult] = useState<{ position: number; data: AiMovesetResponse } | null>(null)
  const [loading, setLoading] = useState<'analyze' | 'pokemon' | number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultSnapshot, setResultSnapshot] = useState<string | null>(null)
  const snapshot = useMemo(() => JSON.stringify({ name: editor.name, pokemon: editor.pokemon }), [editor])
  const stale = Boolean(resultSnapshot && resultSnapshot !== snapshot)

  async function run(action: 'analyze' | 'pokemon' | number) {
    if (!editor.pokemon.length) return
    setLoading(action); setError(null)
    try {
      const input = previewInput(editor)
      if (action === 'analyze') setAnalysis((editor.id ? await analyzeTeamWithAi(editor.id) : await analyzePreviewWithAi(input)).data)
      else if (action === 'pokemon') setPokemonResult((editor.id ? await recommendPokemonWithAi(editor.id) : await recommendPokemonPreviewWithAi(input)).data)
      else setMovesetResult({ position: action, data: (editor.id ? await recommendMovesetWithAi(editor.id, action) : await recommendMovesetPreviewWithAi({ ...input, memberPosition: action })).data })
      setResultSnapshot(snapshot)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'A IA não pôde responder agora.') } finally { setLoading(null) }
  }

  return <section className="lab-card team-ai-panel" aria-labelledby="team-ai-title">
    <div className="team-ai-heading"><div><span className="page-kicker">GEMINI / CAMADA INTERPRETATIVA</span><h2 id="team-ai-title" className="mt-2 font-display text-xl font-bold text-white">Inteligência do time</h2></div><span className="analysis-mark team-ai-mark"><Sparkles size={17} /></span></div>
    <p className="mt-3 text-sm leading-6 text-slate-400">A IA interpreta os fatos calculados pelo motor. Ela não altera a formação automaticamente e não substitui a validação dos dados reais.</p>
    <div className="team-ai-actions"><Button variant="outline" onClick={() => void run('analyze')} disabled={!editor.pokemon.length || loading !== null}><Sparkles size={15} /> {loading === 'analyze' ? 'Analisando…' : 'Analisar com IA'}</Button><Button variant="outline" onClick={() => void run('pokemon')} disabled={!editor.pokemon.length || loading !== null}><WandSparkles size={15} /> {loading === 'pokemon' ? 'Procurando…' : 'Sugerir Pokémon'}</Button></div>
    {stale && <p className="team-ai-stale"><AlertTriangle size={14} /> A formação mudou. As sugestões abaixo estão desatualizadas.</p>}
    {error && <div className="team-ai-error"><AlertTriangle size={14} /><span>{error}</span><button type="button" aria-label="Fechar erro" onClick={() => setError(null)}><X size={14} /></button></div>}
    {editor.pokemon.length > 0 && analysis && <div className="team-ai-result"><AiList title="Pontos fortes" items={analysis.strengths} tone="mint" /><AiList title="Pontos fracos" items={analysis.weaknesses} tone="coral" /><AiList title="Cobertura e sinergia" items={[...analysis.offensiveCoverage, ...analysis.synergy]} tone="violet" /><AiList title="Sugestões" items={analysis.suggestions} tone="electric" />{analysis.limitations.length > 0 && <AiList title="Limitações" items={analysis.limitations} tone="muted" />}</div>}
    {editor.pokemon.length > 0 && pokemonResult && <div className="team-ai-result"><div className="team-ai-result-title"><strong>Pokémon para considerar</strong><span>{pokemonResult.recommendations.length} candidatos</span></div>{pokemonResult.warnings.map((warning) => <p className="team-ai-warning" key={warning}><AlertTriangle size={13} /> {warning}</p>)}{pokemonResult.recommendations.length === 0 && <p className="team-ai-empty">Nenhum candidato passou pela interpretação da IA.</p>}{pokemonResult.recommendations.map((recommendation) => <div className="team-ai-recommendation" key={recommendation.candidateId}><img src={recommendation.pokemon.artworkUrl || recommendation.pokemon.spriteUrl || ''} alt="" /><div><div className="team-ai-recommendation-name"><strong>{recommendation.pokemon.name}</strong><span>{recommendation.suggestedRole}</span></div><div className="flex gap-1">{recommendation.pokemon.types.map((type) => <PokemonTypeBadge compact key={type} type={type} />)}</div><p>{recommendation.reason}</p>{recommendation.limitations.length > 0 && <small>Limitação: {recommendation.limitations.join(' ')}</small>}</div><button className="team-ai-apply" type="button" onClick={() => onApplyPokemon(recommendation)}><Plus size={14} /> Aplicar</button></div>)}</div>}
    {editor.pokemon.length > 0 && movesetResult && <div className="team-ai-result"><div className="team-ai-result-title"><strong>Moveset sugerido para {movesetResult.data.pokemon.name}</strong><span>{movesetResult.data.moves.length}/4 golpes</span></div><p className="team-ai-copy">{movesetResult.data.reason}</p>{movesetResult.data.moves.map((move) => <div className="team-ai-move" key={move.id}><span><strong>{move.name}</strong><small>{move.type || 'tipo n/d'} · {move.category || 'categoria n/d'}</small></span><p>{move.function}</p></div>)}<Button className="mt-3 w-full" onClick={() => onApplyMoveset(movesetResult.position, movesetResult.data)}><Check size={15} /> Aplicar ao rascunho</Button></div>}
    {editor.pokemon.length > 0 && <div className="team-ai-member-actions"><span>Sugerir moveset por integrante</span><div>{editor.pokemon.map((member) => <button key={member.position} type="button" onClick={() => void run(member.position)} disabled={loading !== null}>{loading === member.position ? <RefreshCw size={12} className="animate-spin" /> : <span>0{member.position}</span>} {member.displayNameSnapshot}</button>)}</div></div>}
    <p className="team-ai-footnote">Dados enviados: composição, tipagem, stats e golpes necessários à análise. Nenhum token, e-mail ou dado pessoal é enviado ao Google. As sugestões precisam ser confirmadas e salvas por você.</p>
  </section>
}

function AiList({ title, items, tone }: { title: string; items: string[]; tone: string }) { return <div className="team-ai-list"><h3 className={`team-ai-tone-${tone}`}>{title}</h3>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Sem observações registradas.</p>}</div> }
