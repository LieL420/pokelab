import { CalendarDays, FolderOpen, LockKeyhole, Plus, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/StatusPill'
import { getTeams, deleteTeam } from '@/lib/api'
import { useAuth } from '@/lib/use-auth'

export function MyTeamsPage() {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['teams'], queryFn: ({ signal }) => getTeams(signal), enabled: Boolean(user) })

  async function remove(id: string, name: string) {
    if (!window.confirm(`Excluir “${name}”? Essa ação remove o time e seus movesets.`)) return
    try { await deleteTeam(id); await queryClient.invalidateQueries({ queryKey: ['teams'] }) } catch (error) { window.alert(error instanceof Error ? error.message : 'Não foi possível excluir o time.') }
  }

  if (loading) return <div className="detail-loading"><div className="detail-loading-orb" /><p>Verificando sua sessão…</p></div>
  if (!user) return <div className="space-y-10"><PageHeading /><div className="state-panel"><LockKeyhole className="text-violet" size={26} /><h2>Faça login para ver seus times</h2><p>Seus times são privados e ficam sincronizados entre suas sessões.</p><Button asChild className="mt-3"><Link to="/login">Entrar no PokéLab <FolderOpen size={16} /></Link></Button></div></div>

  return <div className="space-y-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><PageHeading /><Button asChild><Link to="/team-builder"><Plus size={16} /> Criar novo time</Link></Button></div>{query.isPending && <div className="teams-list">{[1, 2].map((item) => <div className="team-card-skeleton" key={item} />)}</div>}{query.isError && <div className="state-panel"><h2>Não foi possível carregar seus times</h2><p>{query.error instanceof Error ? query.error.message : 'Tente novamente em instantes.'}</p><Button onClick={() => void query.refetch()} variant="outline">Tentar novamente</Button></div>}{query.data?.data.length === 0 && <div className="state-panel"><Plus className="text-electric" size={26} /><h2>Sua bancada está livre</h2><p>Crie o primeiro time e comece a testar uma composição casual.</p><Button asChild className="mt-3"><Link to="/team-builder">Montar meu primeiro time <Plus size={16} /></Link></Button></div>}{query.data && query.data.data.length > 0 && <div className="teams-list">{query.data.data.map((team) => <article className="saved-team-card" key={team.id}><div className="flex items-start justify-between gap-3"><div><span className="casual-badge">CASUAL</span><h2 className="mt-3 font-display text-xl font-bold text-white">{team.name}</h2><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{team.description || 'Sem descrição. Abra o time para continuar a pesquisa.'}</p></div><button className="slot-action text-coral" onClick={() => void remove(team.id, team.name)} aria-label={`Excluir ${team.name}`} type="button"><Trash2 size={16} /></button></div><div className="saved-team-pokemon">{Array.from({ length: 6 }, (_, index) => { const member = team.pokemon.find((item) => item.position === index + 1); return <div className="saved-team-avatar" key={index}>{member?.spriteUrlSnapshot ? <img src={member.spriteUrlSnapshot} alt={member.displayNameSnapshot} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</div> })}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><Users size={13} /> {team.pokemon.length}/6 integrantes</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> atualizado {formatDate(team.updatedAt)}</span><Button asChild size="sm" variant="outline"><Link to={`/team-builder/${team.id}`}>Abrir <FolderOpen size={14} /></Link></Button></div></article>)}</div>}</div>
}

function PageHeading() { return <div><StatusPill label="área autenticada" /><h1 className="mt-5 font-display text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Meus times<span className="text-electric">.</span></h1><p className="mt-4 text-slate-400">As ideias que merecem uma segunda batalha, guardadas na sua bancada.</p></div> }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)) }
