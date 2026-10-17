import { cn } from '@/lib/utils'
import { typeClass, typeName } from './pokemon-type'

export function PokemonTypeBadge({ type, compact = false }: { type: string; compact?: boolean }) {
  return <span className={cn('type-badge', typeClass[type] || 'type-normal', compact && 'type-badge-compact')}>{typeName(type)}</span>
}
