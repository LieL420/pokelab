import { AlertTriangle, SearchX } from 'lucide-react'

export function PokemonLoading() { return <div className="pokemon-grid" aria-label="Carregando Pokémon" aria-busy="true">{Array.from({ length: 12 }, (_, index) => <div className="pokemon-skeleton" key={index}><span /><span /><span /></div>)}</div> }
export function PokemonError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="state-panel"><AlertTriangle className="text-coral" size={24} /><h2>Não foi possível carregar o catálogo.</h2><p>{message}</p><button onClick={onRetry} type="button">Tentar novamente</button></div> }
export function PokemonEmpty() { return <div className="state-panel"><SearchX className="text-violet" size={24} /><h2>Nenhum espécime encontrado.</h2><p>Tente outro nome, número ou remova um dos filtros ativos.</p></div> }
