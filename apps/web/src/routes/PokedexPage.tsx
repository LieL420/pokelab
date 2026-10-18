import { useEffect, useState } from 'react'
import { Filter, RotateCcw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PokemonCard } from '@/components/pokemon/PokemonCard'
import { Pagination } from '@/components/pokemon/Pagination'
import { PokemonEmpty, PokemonError, PokemonLoading } from '@/components/pokemon/PokemonStates'
import { SearchBar } from '@/components/pokemon/SearchBar'
import { getPokemonList } from '@/lib/api'

const types = ['all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']

export function PokedexPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [generation, setGeneration] = useState('all')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, 350); return () => window.clearTimeout(timer) }, [searchInput])
  const query = useQuery({ queryKey: ['pokemon-list', { search, generation, type, page }], queryFn: ({ signal }) => getPokemonList({ search, generation: generation === 'all' ? undefined : generation, type: type === 'all' ? undefined : type, page, pageSize: 24 }, signal), placeholderData: (previous) => previous, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, refetchOnWindowFocus: false })
  const hasFilters = Boolean(search || generation !== 'all' || type !== 'all')
  function clearFilters() { setSearchInput(''); setSearch(''); setGeneration('all'); setType('all'); setPage(1) }
  return <div className="space-y-8">
    <section className="pokedex-intro"><div><span className="page-kicker">CATÁLOGO NACIONAL / 1 → 9</span><h1>Pokédex<span>.</span></h1><p>Pesquise por nome ou número. Filtre por tipo e geração. Abra uma ficha quando quiser ir além do primeiro olhar.</p></div><div className="pokedex-intro-mark" aria-hidden="true"><span>LAB</span><strong>001</strong></div></section>
    <section className="catalog-toolbar" aria-label="Busca e filtros"><SearchBar value={searchInput} onChange={setSearchInput} onClear={() => setSearchInput('')} /><div className="filter-row"><label>Geração<select value={generation} onChange={(event) => { setGeneration(event.target.value); setPage(1) }}><option value="all">Todas</option>{Array.from({ length: 9 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Geração {index + 1}</option>)}</select></label><label>Tipo<select value={type} onChange={(event) => { setType(event.target.value); setPage(1) }}>{types.map((item) => <option key={item} value={item}>{item === 'all' ? 'Todos' : item.charAt(0).toUpperCase() + item.slice(1)}</option>)}</select></label>{hasFilters && <button className="clear-filters" onClick={clearFilters} type="button"><RotateCcw size={14} /> Limpar filtros</button>}</div></section>
    <div className="catalog-meta"><p><Filter size={14} /> {query.data ? `${query.data.meta.total} registros encontrados` : 'Consultando o catálogo…'}</p><span>{hasFilters ? 'filtros ativos' : 'catálogo completo'}</span></div>
    {query.isPending ? <PokemonLoading /> : query.isError ? <PokemonError message={query.error instanceof Error ? query.error.message : 'Verifique se a API está em execução.'} onRetry={() => void query.refetch()} /> : query.data.data.length === 0 ? <PokemonEmpty /> : <><div className="pokemon-grid">{query.data.data.map((pokemon) => <PokemonCard key={pokemon.id} pokemon={pokemon} />)}</div><Pagination page={query.data.meta.page} total={query.data.meta.total} pageSize={query.data.meta.pageSize} onChange={setPage} /></>}
  </div>
}
