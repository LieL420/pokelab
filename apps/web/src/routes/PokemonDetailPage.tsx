import { ArrowLeft, CircleHelp, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPokemonDetails } from '@/lib/api'
import { PokemonTypeBadge } from '@/components/pokemon/PokemonTypeBadge'
import { StatBar } from '@/components/pokemon/StatBar'
import { PokemonError } from '@/components/pokemon/PokemonStates'
import type { PokemonMove } from '@/types/pokemon'

const statLabels: Record<string, string> = { hp: 'HP', attack: 'Ataque', defense: 'Defesa', 'special-attack': 'Ataque esp.', 'special-defense': 'Defesa esp.', speed: 'Velocidade' }
function learningLabel(move: PokemonMove) { return move.learnMethod === 'Nível' ? `Nível ${move.levelLearnedAt ?? 1}` : move.learnMethod || '—' }

export function PokemonDetailPage() {
  const { identifier = '' } = useParams()
  const query = useQuery({ queryKey: ['pokemon', identifier], queryFn: ({ signal }) => getPokemonDetails(identifier, signal), enabled: Boolean(identifier), staleTime: 24 * 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false })
  if (query.isPending) return <div className="detail-loading"><div className="detail-loading-orb" /><p>Consultando ficha do espécime…</p></div>
  if (query.isError || !query.data?.data) return <PokemonError message={query.error instanceof Error ? query.error.message : 'A ficha não está disponível.'} onRetry={() => void query.refetch()} />
  const pokemon = query.data.data
  const stats = Object.entries(pokemon.baseStats || {}).map(([key, value]) => ({ key, value, label: statLabels[key] || key }))
  return <div className="space-y-8">
    <Link className="back-link" to="/pokedex"><ArrowLeft size={16} /> Voltar ao catálogo</Link>
    <section className="detail-hero"><div className="detail-hero-copy"><span className="pokemon-index">#{String(pokemon.id).padStart(3, '0')} · ficha de campo</span><h1>{pokemon.name}</h1><p className="detail-species">{pokemon.formSlug !== pokemon.speciesSlug ? pokemon.formSlug : 'espécie base'} · registro {pokemon.speciesId}</p><div className="flex flex-wrap gap-2">{pokemon.types.map((type) => <PokemonTypeBadge key={type} type={type} />)}</div><Link className="button-secondary mt-8" to="/team-builder">Abrir Team Builder <ExternalLink size={15} /></Link></div><div className="detail-hero-art">{pokemon.artworkUrl || pokemon.spriteUrl ? <img src={pokemon.artworkUrl || pokemon.spriteUrl || ''} alt={pokemon.name} /> : <CircleHelp aria-hidden="true" size={52} />}</div></section>
    <div className="detail-layout"><section className="detail-section"><div className="section-heading"><span>01</span><h2>Estatísticas base</h2></div><div className="stats-list">{stats.map((stat) => <StatBar key={stat.key} label={stat.label} value={stat.value} />)}</div></section><section className="detail-section"><div className="section-heading"><span>02</span><h2>Habilidades</h2></div><div className="ability-list">{pokemon.abilities.length ? pokemon.abilities.map((ability) => <div className="ability-row" key={ability.slug}><span>{ability.name}</span>{ability.hidden && <small>oculta</small>}</div>) : <p className="muted-copy">Nenhuma habilidade retornada pela fonte.</p>}</div></section></div>
    <section className="detail-section"><div className="section-heading"><span>03</span><h2>Cadeia evolutiva</h2></div>{pokemon.evolutionChain.length ? <div className="evolution-chain">{pokemon.evolutionChain.map((evolution, index) => <div className="evolution-item" key={`${evolution.id}-${evolution.slug}`}>{index > 0 && <span className="evolution-arrow">→</span>}<Link to={`/pokedex/${evolution.id}`}>{evolution.spriteUrl ? <img src={evolution.spriteUrl} alt="" /> : <div className="evolution-fallback" />}<strong>{evolution.name}</strong>{evolution.condition && <small>{evolution.condition}</small>}</Link></div>)}</div> : <p className="muted-copy">A cadeia evolutiva não está disponível para este registro.</p>}</section>
    <section className="detail-section overflow-hidden"><div className="section-heading"><span>04</span><div><h2>Movimentos</h2><p>Veja se cada golpe é aprendido por nível, TM, tutor ou ovo.</p></div></div>{pokemon.moves.length ? <div className="move-table-wrap"><table className="move-table"><thead><tr><th>Movimento</th><th>Aprendizado</th><th>Tipo</th><th>Categoria</th><th>Poder</th><th>Precisão</th><th>PP</th></tr></thead><tbody>{pokemon.moves.map((move) => <tr key={move.id}><td>{move.name}</td><td>{learningLabel(move)}</td><td>{move.type ? <PokemonTypeBadge compact type={move.type} /> : '—'}</td><td>{move.category || '—'}</td><td>{move.power ?? '—'}</td><td>{move.accuracy ? `${move.accuracy}%` : '—'}</td><td>{move.pp ?? '—'}</td></tr>)}</tbody></table></div> : <p className="muted-copy">Nenhum movimento disponível.</p>}</section>
    <p className="source-note">Fonte: {pokemon.source}. {pokemon.partial ? 'Alguns campos podem estar incompletos.' : 'Ficha normalizada pelo backend do PokéLab.'}</p>
  </div>
}
