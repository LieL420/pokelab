import { getTypeMultiplier, TYPES, validateTypeChart } from './type-chart'

describe('casual-v1 type chart', () => {
  it('validates all modern types and known interactions', () => {
    expect(validateTypeChart()).toBe(true)
    expect(TYPES).toHaveLength(18)
  })

  it('calculates single and dual type interactions', () => {
    expect(getTypeMultiplier('fire', ['grass'])).toBe(2)
    expect(getTypeMultiplier('rock', ['fire', 'flying'])).toBe(4)
    expect(getTypeMultiplier('ground', ['fire', 'flying'])).toBe(0)
    expect(getTypeMultiplier('water', ['dragon'])).toBe(0.5)
    expect(getTypeMultiplier('normal', ['ghost'])).toBe(0)
    expect(getTypeMultiplier('psychic', ['normal'])).toBe(1)
  })
})
