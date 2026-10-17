import { Search, X } from 'lucide-react'

export function SearchBar({ value, onChange, onClear }: { value: string; onChange: (value: string) => void; onClear: () => void }) { return <label className="search-bar"><Search aria-hidden="true" size={18} /><span className="sr-only">Buscar Pokémon por nome ou número</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar por nome ou número" /><button aria-label="Limpar pesquisa" className={value ? 'search-clear' : 'search-clear invisible'} onClick={onClear} type="button"><X size={16} /></button></label> }
