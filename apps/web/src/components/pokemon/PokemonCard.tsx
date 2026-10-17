import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PokemonSummary } from '@/types/pokemon'
import { PokemonTypeBadge } from './PokemonTypeBadge'
import { typeClass, typeName } from './pokemon-type'

export function PokemonCard({ pokemon }: { pokemon: PokemonSummary }) {
  const primaryType = pokemon.types[0] || 'normal'
  return <Link className={`pokemon-card ${typeClass[primaryType] || 'type-normal'}`} to={`/pokedex/${pokemon.id}`}><div className="pokemon-card-top"><span className="pokemon-index">#{String(pokemon.id).padStart(3, '0')}</span><ArrowUpRight aria-hidden="true" size={16} /></div><div className="pokemon-art-orb" />{pokemon.artworkUrl || pokemon.spriteUrl ? <img className="pokemon-art" src={pokemon.artworkUrl || pokemon.spriteUrl || ''} alt={pokemon.name} loading="lazy" /> : <div className="pokemon-art-fallback" aria-hidden="true">?</div>}<div className="pokemon-card-footer"><div><h3>{pokemon.name}</h3><p>{typeName(primaryType)} · espécie {pokemon.speciesId}</p></div><div className="type-stack" aria-label={`Tipos: ${pokemon.types.map(typeName).join(', ')}`}>{pokemon.types.map((type) => <PokemonTypeBadge compact key={type} type={type} />)}</div></div></Link>
}
