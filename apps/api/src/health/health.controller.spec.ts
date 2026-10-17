import { getHealthResponse } from './health.contract'

describe('HealthController', () => {
  it('returns the API health contract', () => {
    expect(getHealthResponse()).toEqual({ status: 'ok', service: 'pokelab-api' })
  })
})
