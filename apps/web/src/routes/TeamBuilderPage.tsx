import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronRight, CircleAlert, Plus, Save, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PokemonPicker } from '@/components/team/PokemonPicker'
import { TeamAnalysisPanel } from '@/components/team/TeamAnalysisPanel'
import { TeamAiPanel } from '@/components/team/TeamAiPanel'
import { PokemonTypeBadge } from '@/components/pokemon/PokemonTypeBadge'
import { getPokemonDetails, getTeam, addTeamPokemon, createTeam, previewTeamStrategicAnalysis, getTeamStrategicAnalysis, removeTeamPokemon, replaceTeamMoves, updateTeam, updateTeamPokemon } from '@/lib/api'
import { analyzeLocalTeam } from '@/lib/team-analysis'
import { useAuth } from '@/lib/use-auth'
import type { PokemonDetails, PokemonMove, PokemonSummary } from '@/types/pokemon'
import type { AiMovesetResponse, AiPokemonRecommendation, Team, TeamEditorMember, TeamEditorState } from '@/types/team'

const DRAFT_KEY = 'pokelab:team-draft:v1'

function blankEditor(): TeamEditorState { return { name: 'Meu time casual', description: '', format: 'casual', pokemon: [] } }

function readDraft(): TeamEditorState {
  if (typeof window === 'undefined') return blankEditor()
  try {
    const value = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || '') as TeamEditorState
    return value?.name && Array.isArray(value.pokemon) ? value : blankEditor()
  } catch { return blankEditor() }
}

function fromTeam(team: Team): TeamEditorState {
  return { id: team.id, name: team.name, description: team.description ?? '', format: team.format, pokemon: team.pokemon.map((member) => ({ ...member })) }
}

function toComparable(editor: TeamEditorState) {
  return JSON.stringify({ id: editor.id, name: editor.name, description: editor.description, format: editor.format, pokemon: editor.pokemon.map((member) => { const copy = { ...member }; delete copy.source; return copy }).sort((a, b) => a.position - b.position) })
}

function memberFromSummary(pokemon: PokemonSummary, position: number, id?: string): TeamEditorMember {
  return { id, position, speciesId: pokemon.speciesId, speciesSlug: pokemon.speciesSlug, formId: pokemon.formId, formSlug: pokemon.formSlug, displayNameSnapshot: pokemon.name, spriteUrlSnapshot: pokemon.artworkUrl || pokemon.spriteUrl, moves: [], source: pokemon }
}

export function TeamBuilderPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [editor, setEditor] = useState<TeamEditorState>(() => teamId ? blankEditor() : readDraft())
  const [pickerPosition, setPickerPosition] = useState<number | null>(null)
  const [deletedMemberIds, setDeletedMemberIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [analysisNonce, setAnalysisNonce] = useState(0)
  const [analysisSource, setAnalysisSource] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() => toComparable(teamId ? blankEditor() : readDraft()))
  const loadedTeamId = useRef<string | null>(null)

  const savedTeamQuery = useQuery({ queryKey: ['team', teamId], queryFn: ({ signal }) => getTeam(teamId || '', signal), enabled: Boolean(teamId && user) })

  useEffect(() => {
    if (!teamId || !savedTeamQuery.data?.data || loadedTeamId.current === teamId) return
    const next = fromTeam(savedTeamQuery.data.data)
    setEditor(next)
    setSavedSnapshot(toComparable(next))
    setDeletedMemberIds([])
    loadedTeamId.current = teamId
  }, [savedTeamQuery.data, teamId])

  useEffect(() => {
    if (!teamId) window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...editor, id: undefined }))
  }, [editor, teamId])

  const dirty = toComparable(editor) !== savedSnapshot
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const detailQueries = useQueries({ queries: editor.pokemon.map((member) => ({ queryKey: ['team-member-details', member.formId || member.speciesId], queryFn: ({ signal }: { signal: AbortSignal }) => getPokemonDetails(String(member.formId || member.speciesId), signal) })) })
  const detailByMemberIndex = detailQueries.map((query) => query.data?.data)
  const knownDetails = detailByMemberIndex.filter((detail): detail is PokemonDetails => Boolean(detail))
  const analysis = knownDetails.length ? analyzeLocalTeam(knownDetails, editor.pokemon.flatMap((member) => member.moves.map((move) => move.moveId))) : null
  const analysisSnapshot = toComparable(editor)
  const strategicAnalysisQuery = useQuery({
    queryKey: ['team-strategic-analysis', editor.id ?? 'draft', analysisNonce],
    enabled: analysisNonce > 0 && editor.pokemon.length > 0,
    queryFn: ({ signal }) => editor.id && !dirty
      ? getTeamStrategicAnalysis(editor.id, signal)
      : previewTeamStrategicAnalysis({ name: editor.name, format: editor.format, pokemon: editor.pokemon.map((member) => ({ position: member.position, speciesId: member.speciesId, speciesSlug: member.speciesSlug, formId: member.formId, formSlug: member.formSlug, moves: member.moves.map(({ slot, moveId, moveSlug }) => ({ slot, moveId, moveSlug })) })) }, signal),
  })

  function requestStrategicAnalysis() {
    if (!editor.pokemon.length) return
    setAnalysisSource(analysisSnapshot)
    setAnalysisNonce((value) => value + 1)
  }

  function updateEditor(updater: (current: TeamEditorState) => TeamEditorState) {
    setEditor((current) => { const next = updater(current); return { ...next, pokemon: next.pokemon.slice().sort((a, b) => a.position - b.position) } })
    setNotice(null)
  }

  function choosePokemon(pokemon: PokemonSummary) {
    if (!pickerPosition) return
    const selectedPosition = pickerPosition
    updateEditor((current) => {
      const existing = current.pokemon.find((member) => member.position === selectedPosition)
      const next = memberFromSummary(pokemon, selectedPosition, existing?.id)
      return { ...current, pokemon: existing ? current.pokemon.map((member) => member.position === selectedPosition ? next : member) : [...current.pokemon, next] }
    })
    setPickerPosition(null)
  }

  function removeMember(member: TeamEditorMember) {
    updateEditor((current) => ({ ...current, pokemon: current.pokemon.filter((item) => item !== member) }))
    if (member.id) setDeletedMemberIds((ids) => ids.includes(member.id || '') ? ids : [...ids, member.id || ''])
  }

  function moveMember(member: TeamEditorMember, direction: -1 | 1) {
    const target = member.position + direction
    if (target < 1 || target > 6) return
    if (editor.pokemon.some((item) => item.position === target)) { setNotice({ type: 'error', message: 'Essa posição já está ocupada. Mova o outro espécime para um slot vazio primeiro.' }); return }
    updateEditor((current) => ({ ...current, pokemon: current.pokemon.map((item) => item === member ? { ...item, position: target } : item) }))
  }

  function setMove(targetMember: TeamEditorMember, details: PokemonDetails | undefined, slot: number, value: string) {
    if (!details) return
    const moveId = Number(value)
    if (targetMember.moves.some((move) => move.slot !== slot && move.moveId === moveId)) { setNotice({ type: 'error', message: 'Esse golpe já está em outro slot deste Pokémon.' }); return }
    const selected = details.moves.find((move) => move.id === moveId)
    updateEditor((current) => ({ ...current, pokemon: current.pokemon.map((member) => {
      if (member !== targetMember) return member
      const moves = member.moves.filter((move) => move.slot !== slot)
      return { ...member, moves: selected ? [...moves, moveFromDetails(selected, slot)].sort((a, b) => a.slot - b.slot) : moves }
    }) }))
  }

  function applyAiPokemon(recommendation: AiPokemonRecommendation) {
    const position = [1, 2, 3, 4, 5, 6].find((slot) => !editor.pokemon.some((member) => member.position === slot))
    if (!position) { setNotice({ type: 'error', message: 'O time já está cheio. Remova um integrante antes de aplicar a sugestão.' }); return }
    updateEditor((current) => ({ ...current, pokemon: [...current.pokemon, memberFromSummary(recommendation.pokemon, position)] }))
    setNotice({ type: 'success', message: `${recommendation.pokemon.name} foi adicionado ao rascunho. Salve o time para persistir.` })
  }

  function applyAiMoveset(position: number, recommendation: AiMovesetResponse) {
    const member = editor.pokemon.find((item) => item.position === position)
    if (!member) { setNotice({ type: 'error', message: 'Esse integrante não está mais na formação.' }); return }
    const moves = recommendation.moves.map((move, index) => ({ slot: index + 1, moveId: move.id, moveSlug: move.slug, moveNameSnapshot: move.name }))
    updateEditor((current) => ({ ...current, pokemon: current.pokemon.map((item) => item.position === position ? { ...item, moves } : item) }))
    setNotice({ type: 'success', message: `Moveset de ${member.displayNameSnapshot} aplicado ao rascunho. Salve para persistir.` })
  }

  async function save() {
    if (!user) { setNotice({ type: 'error', message: 'Entre no PokéLab para salvar. Seu rascunho continua neste navegador.' }); return }
    if (!editor.name.trim()) { setNotice({ type: 'error', message: 'Dê um nome ao time antes de salvar.' }); return }
    setSaving(true); setNotice(null)
    try {
      let persisted = editor.id ? (await updateTeam(editor.id, { name: editor.name.trim(), description: editor.description.trim() || null, format: editor.format })).data : (await createTeam({ name: editor.name.trim(), description: editor.description.trim() || undefined, format: editor.format })).data
      for (const memberId of deletedMemberIds) await removeTeamPokemon(persisted.id, memberId)
      for (const member of editor.pokemon) {
        const response = member.id ? await updateTeamPokemon(persisted.id, member.id, { position: member.position, speciesId: member.speciesId, speciesSlug: member.speciesSlug, formId: member.formId ?? undefined, formSlug: member.formSlug ?? undefined, displayNameSnapshot: member.displayNameSnapshot, spriteUrlSnapshot: member.spriteUrlSnapshot }) : await addTeamPokemon(persisted.id, member)
        persisted = response.data
        const savedMember = persisted.pokemon.find((item) => item.position === member.position)
        if (savedMember) persisted = (await replaceTeamMoves(persisted.id, savedMember.id, member.moves)).data
      }
      const next = fromTeam(persisted)
      setEditor(next); setSavedSnapshot(toComparable(next)); setDeletedMemberIds([]); window.localStorage.removeItem(DRAFT_KEY)
      setNotice({ type: 'success', message: 'Time salvo no PokéLab.' })
      if (!teamId) navigate(`/team-builder/${persisted.id}`, { replace: true })
    } catch (error) { setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível salvar o time. Nenhuma alteração local foi descartada.' }) } finally { setSaving(false) }
  }

  if (authLoading || (teamId && user && savedTeamQuery.isPending)) return <div className="detail-loading"><div className="detail-loading-orb" /><p>Preparando a bancada…</p></div>
  if (teamId && !user) return <AuthRequiredState />
  if (teamId && savedTeamQuery.isError) return <div className="state-panel"><CircleAlert className="text-coral" /><h2>Não foi possível abrir este time</h2><p>{savedTeamQuery.error instanceof Error ? savedTeamQuery.error.message : 'Verifique sua sessão e tente novamente.'}</p><Button onClick={() => void savedTeamQuery.refetch()} variant="outline">Tentar novamente</Button></div>

  return <div className="team-builder-page space-y-5">
    <div className="team-builder-header"><div><Link className="back-link" to="/teams"><ArrowLeft size={15} /> Meus times</Link><div className="mt-5 flex flex-wrap items-center gap-3"><span className="page-kicker">BANCADA / {editor.id ? 'EDIÇÃO' : 'RASCUNHO LOCAL'}</span><span className="casual-badge">CASUAL</span></div><h1 className="mt-3 font-display text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">Monte seu time<span className="text-electric">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Escolha até seis espécimes e ajuste os golpes que você quer levar para a próxima ideia.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/teams"><SlidersHorizontal size={16} /> Meus times</Link></Button><Button onClick={() => void save()} disabled={saving || !dirty}><Save size={16} /> {saving ? 'Salvando…' : dirty ? 'Salvar alterações' : 'Tudo salvo'}</Button></div></div>
    {notice && <div className={`team-notice ${notice.type === 'error' ? 'team-notice-error' : 'team-notice-success'}`} role="status"><span>{notice.type === 'error' ? <CircleAlert size={17} /> : <Check size={17} />}</span><p>{notice.message}</p><button onClick={() => setNotice(null)} aria-label="Fechar aviso" type="button"><X size={15} /></button></div>}
    <section className="team-meta-card"><div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"><label className="field-label"><span>Nome do time</span><input className="field-input" maxLength={80} value={editor.name} onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Rota da Aurora" /></label><label className="field-label"><span>Descrição <em className="font-normal text-slate-600">opcional</em></span><input className="field-input" maxLength={500} value={editor.description} onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))} placeholder="Uma frase sobre a ideia do time" /></label><div className="team-count"><strong>{editor.pokemon.length}</strong><span>/ 6<br />slots usados</span></div></div></section>
    <div className="team-builder-grid grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]"><section aria-labelledby="team-slots-title"><div className="mb-3 flex items-center justify-between"><div><span className="page-kicker">FORMAÇÃO</span><h2 id="team-slots-title" className="mt-1 font-display text-xl font-bold text-white">Seis posições, uma hipótese</h2></div><span className="font-mono text-xs text-slate-600">{dirty ? 'alterações pendentes' : 'sincronizado'}</span></div><div className="team-slots-grid">{Array.from({ length: 6 }, (_, index) => { const position = index + 1; const member = editor.pokemon.find((item) => item.position === position); const detail = member ? detailByMemberIndex[editor.pokemon.indexOf(member)] : undefined; return <TeamSlotCard key={position} member={member} detail={detail} position={position} onAdd={() => setPickerPosition(position)} onRemove={() => member && removeMember(member)} onMove={(direction) => member && moveMember(member, direction)} onMoveSelect={(slot, value) => member && setMove(member, detail, slot, value)} /> })}</div></section><div className="team-builder-sidebar"><TeamAnalysisPanel analysis={analysis} loading={editor.pokemon.length > 0 && detailQueries.some((query) => query.isPending)} strategicAnalysis={strategicAnalysisQuery.data?.data ?? null} strategicLoading={strategicAnalysisQuery.isFetching} strategicStale={Boolean(strategicAnalysisQuery.data && analysisSource !== analysisSnapshot)} strategicError={strategicAnalysisQuery.error instanceof Error ? strategicAnalysisQuery.error.message : null} onAnalyze={requestStrategicAnalysis} /></div></div><section className="team-builder-ai" aria-labelledby="team-ai-title"><TeamAiPanel editor={editor} onApplyPokemon={applyAiPokemon} onApplyMoveset={applyAiMoveset} /></section>
    {pickerPosition && <PokemonPicker position={pickerPosition} onSelect={choosePokemon} onClose={() => setPickerPosition(null)} />}
  </div>
}

function TeamSlotCard({ member, detail, position, onAdd, onRemove, onMove, onMoveSelect }: { member?: TeamEditorMember; detail?: PokemonDetails; position: number; onAdd: () => void; onRemove: () => void; onMove: (direction: -1 | 1) => void; onMoveSelect: (slot: number, value: string) => void }) {
  if (!member) return <button className="team-slot-empty" onClick={onAdd} type="button"><span className="slot-number">0{position}</span><span className="slot-plus"><Plus size={21} /></span><strong>adicionar Pokémon</strong><small>posição {position}</small></button>
  const types = detail?.types || member.source?.types || []
  return <article className={`team-slot-filled type-${types[0] || 'normal'}`}><div className="team-slot-glow" /><div className="relative z-10 flex items-start justify-between gap-2"><span className="slot-number">0{position}</span><div className="flex gap-1">{types.map((type) => <PokemonTypeBadge compact key={type} type={type} />)}</div></div><div className="relative z-10 flex min-h-32 items-center justify-center">{member.spriteUrlSnapshot ? <img className="team-slot-art" src={member.spriteUrlSnapshot} alt={member.displayNameSnapshot} /> : <span className="text-5xl text-slate-600">◌</span>}</div><div className="relative z-10"><div className="flex items-end justify-between gap-3"><div><h3 className="font-display text-lg font-bold text-white">{member.displayNameSnapshot}</h3><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">#{String(member.formId || member.speciesId).padStart(3, '0')} · {member.moves.length}/4 golpes</p></div><div className="flex gap-1"><button className="slot-action" onClick={onAdd} aria-label={`Substituir ${member.displayNameSnapshot}`} type="button"><SlidersHorizontal size={14} /></button><button className="slot-action text-coral" onClick={onRemove} aria-label={`Remover ${member.displayNameSnapshot}`} type="button"><Trash2 size={14} /></button></div></div><div className="team-card-moves"><div className="team-card-moves-heading"><span>MOVESET</span><small>{member.moves.length}/4 selecionados</small></div>{[1, 2, 3, 4].map((slot) => { const selected = member.moves.find((move) => move.slot === slot); const usedIds = new Set(member.moves.filter((move) => move.slot !== slot).map((move) => move.moveId)); return <div className="team-card-move-slot" key={slot}><span className="team-move-index">0{slot}</span><MoveSelector memberName={member.displayNameSnapshot} slot={slot} selected={selected} details={detail} usedIds={usedIds} onSelect={(value) => onMoveSelect(slot, value)} /></div> })}</div><div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><div className="flex gap-1"><button className="slot-action" onClick={() => onMove(-1)} disabled={position === 1} aria-label="Mover para a posição anterior" type="button"><ArrowUp size={14} /></button><button className="slot-action" onClick={() => onMove(1)} disabled={position === 6} aria-label="Mover para a próxima posição" type="button"><ArrowDown size={14} /></button></div><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-600">{detail ? 'dados reais' : 'carregando golpes…'}</span></div></div></article>
}

function MoveSelector({ memberName, slot, selected, details, usedIds, onSelect }: { memberName: string; slot: number; selected?: TeamEditorMember['moves'][number]; details?: PokemonDetails; usedIds: Set<number>; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selectedMove = details?.moves.find((move) => move.id === selected?.moveId)
  const filteredMoves = details?.moves.filter((move) => {
    if (usedIds.has(move.id) && move.id !== selected?.moveId) return false
    const needle = search.trim().toLocaleLowerCase()
    return !needle || `${move.name} ${move.type || ''} ${move.category || ''}`.toLocaleLowerCase().includes(needle)
  }) || []

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); setSearch('') } }
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); setSearch('') } }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    searchRef.current?.focus()
    return () => { document.removeEventListener('pointerdown', handlePointerDown); document.removeEventListener('keydown', handleKeyDown) }
  }, [open])

  function chooseMove(moveId: number) {
    onSelect(String(moveId))
    setOpen(false)
    setSearch('')
  }

  return <div className="team-card-move-control" ref={rootRef}><button className={`team-card-move-trigger ${selectedMove ? '' : 'team-card-move-trigger-empty'}`} type="button" disabled={!details} aria-haspopup="listbox" aria-expanded={open} aria-label={`${memberName}, golpe ${slot}`} onClick={() => { if (open) setSearch(''); setOpen((value) => !value) }}><span className="team-card-move-trigger-copy">{selectedMove?.name || (details ? 'Selecionar golpe' : 'Carregando golpes…')}</span>{selectedMove ? <MoveCategoryBadge category={selectedMove.category} compact /> : <ChevronDown size={14} aria-hidden="true" />}</button>{open && details && <div className="move-picker-menu"><div className="move-picker-search-wrap"><Search size={14} aria-hidden="true" /><input ref={searchRef} className="move-picker-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar golpe…" aria-label="Buscar golpe" /></div><div className="move-picker-options" role="listbox" aria-label={`Golpes de ${memberName}`}>{selected && <button className="move-picker-clear" type="button" role="option" onClick={() => { onSelect(''); setOpen(false); setSearch('') }}>Limpar seleção</button>}{filteredMoves.map((move) => <button className={`move-picker-option ${selected?.moveId === move.id ? 'move-picker-option-active' : ''}`} key={move.id} type="button" role="option" aria-selected={selected?.moveId === move.id} onClick={() => chooseMove(move.id)}><span className="move-picker-option-copy"><strong>{move.name}</strong><small>{move.type ? <PokemonTypeBadge compact type={move.type} /> : <span>tipo n/d</span>}</small></span><MoveCategoryBadge category={move.category} /></button>)}{filteredMoves.length === 0 && <p className="move-picker-empty">Nenhum golpe encontrado.</p>}</div></div>}</div>
}

function MoveCategoryBadge({ category, compact = false }: { category?: PokemonMove['category']; compact?: boolean }) {
  const normalized = category?.toLowerCase()
  const kind = normalized === 'physical' ? 'physical' : normalized === 'special' ? 'special' : normalized === 'status' ? 'status' : 'unknown'
  const label = kind === 'physical' ? 'Físico' : kind === 'special' ? 'Especial' : kind === 'status' ? 'Status' : '—'
  return <span className={`move-category-badge move-category-${kind} ${compact ? 'move-category-badge-compact' : ''}`} title={label === '—' ? 'Categoria não informada' : `Golpe ${label.toLocaleLowerCase()}`}><CategoryIcon kind={kind} /><span>{label}</span></span>
}

function CategoryIcon({ kind }: { kind: 'physical' | 'special' | 'status' | 'unknown' }) {
  if (kind === 'special') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.2" /></svg>
  if (kind === 'status') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M12 3.5a8.5 8.5 0 0 1 0 17a4.2 4.2 0 0 0 0-8.4a4.2 4.2 0 0 1 0-8.4Z" /></svg>
  if (kind === 'physical') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2 5 4-3-1 5 5-1-3 4 5 2-5 2 3 4-5-1 1 5-4-3-2 5-2-5-4 3 1-5-5 1 3-4-5-2 5-2-3-4 5 1-1-5 4 3 2-5Z" /><circle cx="12" cy="12" r="2.2" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" strokeDasharray="2.5 2.5" /></svg>
}
function moveFromDetails(move: PokemonMove, slot: number) { return { slot, moveId: move.id, moveSlug: move.slug, moveNameSnapshot: move.name } }
function AuthRequiredState() { return <div className="state-panel"><CircleAlert className="text-violet" /><h2>Entre para abrir seus times</h2><p>Times salvos são privados. O rascunho local continua disponível ao voltar para o Team Builder.</p><Button asChild><Link to="/login">Entrar no PokéLab <ChevronRight size={16} /></Link></Button></div> }
