import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPokemonList } from '@/lib/api'
import type { PokemonSummary } from '@/types/pokemon'
import { PokemonTypeBadge } from '@/components/pokemon/PokemonTypeBadge'

const types = ['all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']

export function PokemonPicker({ position, onSelect, onClose }: { position: number; onSelect: (pokemon: PokemonSummary) => void; onClose: () => void }) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const query = useQuery({
    queryKey: ['team-picker', search, type],
    queryFn: ({ signal }) => getPokemonList({ search, type: type === 'all' ? undefined : type, page: 1, pageSize: 12 }, signal),
    placeholderData: (previous) => previous,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 600,
  })

  return <div className="fixed inset-0 z-30 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pokemon-picker-title">
    <div className="team-picker-panel w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-panel shadow-2xl shadow-black/50">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
        <div><span className="page-kicker">SLOT 0{position} / CATÁLOGO</span><h2 id="pokemon-picker-title" className="mt-2 font-display text-2xl font-bold text-white">Escolha um espécime</h2><p className="mt-1 text-sm text-slate-500">Espécies repetidas são permitidas no modo Casual.</p></div>
        <button className="grid size-9 place-items-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Fechar seletor" type="button"><X size={18} /></button>
      </div>
      <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-[1fr_auto]">
        <label className="search-bar"><Search size={17} /><span className="sr-only">Pesquisar Pokémon</span><input autoFocus value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nome ou número da Pokédex" /></label>
        <label className="field-label"><span className="sr-only">Filtrar tipo</span><select className="field-input min-w-40" value={type} onChange={(event) => setType(event.target.value)}>{types.map((item) => <option key={item} value={item}>{item === 'all' ? 'Todos os tipos' : item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
      </div>
      <div className="max-h-[min(60vh,34rem)] overflow-y-auto p-4 sm:p-5">
        {query.isPending && <div className="grid gap-3 sm:grid-cols-2"><div className="team-picker-skeleton" /><div className="team-picker-skeleton" /><div className="team-picker-skeleton" /><div className="team-picker-skeleton" /></div>}
        {query.isError && <div className="state-panel py-12"><h3>Catálogo indisponível</h3><p>{query.error instanceof Error ? query.error.message : 'Não foi possível carregar os Pokémon.'}</p><button onClick={() => void query.refetch()} type="button">Tentar novamente</button></div>}
        {query.data?.data.length === 0 && <div className="state-panel py-12"><h3>Nenhum espécime encontrado</h3><p>Tente outro nome, número ou remova o filtro de tipo.</p></div>}
        <div className="grid gap-3 sm:grid-cols-2">{query.data?.data.map((pokemon) => <button className="team-picker-result" key={pokemon.id} onClick={() => onSelect(pokemon)} type="button"><span className={`team-picker-orb type-${pokemon.types[0] || 'normal'}`} />{pokemon.spriteUrl ? <img src={pokemon.spriteUrl} alt="" /> : <span className="text-3xl">◌</span>}<span className="min-w-0 flex-1 text-left"><small>#{String(pokemon.id).padStart(3, '0')}</small><strong>{pokemon.name}</strong><span className="flex gap-1">{pokemon.types.map((item) => <PokemonTypeBadge compact key={item} type={item} />)}</span></span><span className="text-electric">Adicionar</span></button>)}</div>
      </div>
    </div>
  </div>
}
