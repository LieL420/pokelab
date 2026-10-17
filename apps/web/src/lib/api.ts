import type { PokemonDetails, PokemonListResponse } from '@/types/pokemon'
import { supabaseClient } from './supabase'
import type { AiMovesetResponse, AiPokemonResponse, AiTeamAnalysis, Team, TeamAnalysis, TeamEditorMember, TeamListResponse, TeamStrategicAnalysis } from '@/types/team'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export type HealthResponse = { status: 'ok'; service: string }

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, { signal })
  if (!response.ok) throw new Error(`A API respondeu com status ${response.status}.`)
  return response.json() as Promise<HealthResponse>
}

export type PokemonListParams = { search?: string; type?: string; generation?: string; page?: number; pageSize?: number }

async function request<T>(path: string, options: { signal?: AbortSignal; auth?: boolean; method?: string; body?: unknown } = {}): Promise<T> {
  let token: string | undefined
  if (options.auth) {
    const session = await supabaseClient?.auth.getSession()
    token = session?.data.session?.access_token
    if (!token) throw new Error('Entre no PokéLab para salvar um time.')
  }
  const response = await fetch(`${API_URL}${path}`, {
    signal: options.signal,
    method: options.method ?? 'GET',
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
  if (!response.ok) {
    let message = `A API respondeu com status ${response.status}.`
    try {
      const payload = await response.json() as { error?: { message?: string } }
      message = payload.error?.message || message
    } catch { /* Use the stable fallback when the server did not return JSON. */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getPokemonList(params: PokemonListParams, signal?: AbortSignal) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.type) query.set('type', params.type)
  if (params.generation) query.set('generation', params.generation)
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 24))
  return request<PokemonListResponse>(`/v1/pokemon?${query.toString()}`, { signal })
}

export function getPokemonDetails(identifier: string, signal?: AbortSignal) {
  return request<{ data: PokemonDetails }>(`/v1/pokemon/${encodeURIComponent(identifier)}`, { signal })
}

export function getTeams(signal?: AbortSignal) {
  return request<TeamListResponse>('/v1/teams?page=1&pageSize=100', { signal, auth: true })
}

export function getTeam(teamId: string, signal?: AbortSignal) {
  return request<{ data: Team }>(`/v1/teams/${encodeURIComponent(teamId)}`, { signal, auth: true })
}

export function createTeam(input: { name: string; description?: string; format: 'casual' }) {
  return request<{ data: Team }>('/v1/teams', { auth: true, method: 'POST', body: input })
}

export function updateTeam(teamId: string, input: { name?: string; description?: string | null; format?: 'casual' }) {
  return request<{ data: Team }>(`/v1/teams/${encodeURIComponent(teamId)}`, { auth: true, method: 'PATCH', body: input })
}

export function deleteTeam(teamId: string) {
  return request<void>(`/v1/teams/${encodeURIComponent(teamId)}`, { auth: true, method: 'DELETE' })
}

export function addTeamPokemon(teamId: string, member: TeamEditorMember) {
  return request<{ data: Team }>(`/v1/teams/${encodeURIComponent(teamId)}/pokemon`, {
    auth: true,
    method: 'POST',
    body: {
      position: member.position,
      speciesId: member.speciesId,
      speciesSlug: member.speciesSlug,
      formId: member.formId ?? undefined,
      formSlug: member.formSlug ?? undefined,
      displayNameSnapshot: member.displayNameSnapshot,
      spriteUrlSnapshot: member.spriteUrlSnapshot,
    },
  })
}

export function updateTeamPokemon(teamId: string, memberId: string, input: Partial<Pick<TeamEditorMember, 'position' | 'speciesId' | 'speciesSlug' | 'formId' | 'formSlug' | 'displayNameSnapshot' | 'spriteUrlSnapshot'>>) {
  return request<{ data: Team }>(`/v1/teams/${encodeURIComponent(teamId)}/pokemon/${encodeURIComponent(memberId)}`, { auth: true, method: 'PATCH', body: input })
}

export function removeTeamPokemon(teamId: string, memberId: string) {
  return request<void>(`/v1/teams/${encodeURIComponent(teamId)}/pokemon/${encodeURIComponent(memberId)}`, { auth: true, method: 'DELETE' })
}

export function replaceTeamMoves(teamId: string, memberId: string, moves: TeamEditorMember['moves']) {
  return request<{ data: Team }>(`/v1/teams/${encodeURIComponent(teamId)}/pokemon/${encodeURIComponent(memberId)}/moves`, { auth: true, method: 'PUT', body: { moves: moves.map(({ slot, moveId, moveSlug, moveNameSnapshot }) => ({ slot, moveId, moveSlug, moveNameSnapshot })) } })
}

export function getTeamTypeAnalysis(teamId: string, signal?: AbortSignal) {
  return request<{ data: TeamAnalysis }>(`/v1/teams/${encodeURIComponent(teamId)}/type-analysis`, { signal, auth: true })
}

export type AnalysisPreviewInput = { name?: string; format?: 'casual'; pokemon: Array<{ position: number; speciesId: number; speciesSlug: string; formId?: number | null; formSlug?: string | null; moves: Array<{ slot: number; moveId: number; moveSlug: string }> }> }

export function getTeamStrategicAnalysis(teamId: string, signal?: AbortSignal) {
  return request<{ data: TeamStrategicAnalysis }>(`/v1/teams/${encodeURIComponent(teamId)}/analysis`, { signal, auth: true })
}

export function previewTeamStrategicAnalysis(input: AnalysisPreviewInput, signal?: AbortSignal) {
  return request<{ data: TeamStrategicAnalysis }>('/v1/analysis/teams/preview', { signal, method: 'POST', body: input })
}

export function analyzeTeamWithAi(teamId: string, signal?: AbortSignal) { return request<{ data: AiTeamAnalysis }>(`/v1/ai/teams/${encodeURIComponent(teamId)}/analyze`, { signal, method: 'POST', auth: true }) }
export function recommendPokemonWithAi(teamId: string, signal?: AbortSignal) { return request<{ data: AiPokemonResponse }>(`/v1/ai/teams/${encodeURIComponent(teamId)}/recommend-pokemon`, { signal, method: 'POST', auth: true }) }
export function recommendMovesetWithAi(teamId: string, memberPosition: number, signal?: AbortSignal) { return request<{ data: AiMovesetResponse }>(`/v1/ai/teams/${encodeURIComponent(teamId)}/recommend-moveset`, { signal, method: 'POST', auth: true, body: { memberPosition } }) }

export function analyzePreviewWithAi(input: AnalysisPreviewInput, signal?: AbortSignal) { return request<{ data: AiTeamAnalysis }>('/v1/ai/preview/analyze', { signal, method: 'POST', body: input, auth: true }) }
export function recommendPokemonPreviewWithAi(input: AnalysisPreviewInput, signal?: AbortSignal) { return request<{ data: AiPokemonResponse }>('/v1/ai/preview/recommend-pokemon', { signal, method: 'POST', body: input, auth: true }) }
export function recommendMovesetPreviewWithAi(input: AnalysisPreviewInput & { memberPosition: number }, signal?: AbortSignal) { return request<{ data: AiMovesetResponse }>('/v1/ai/preview/recommend-moveset', { signal, method: 'POST', body: input, auth: true }) }

export { API_URL }
