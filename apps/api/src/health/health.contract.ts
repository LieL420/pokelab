export type HealthResponse = { status: 'ok'; service: 'pokelab-api' }

export function getHealthResponse(): HealthResponse {
  return { status: 'ok', service: 'pokelab-api' }
}
