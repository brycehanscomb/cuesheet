import { describe, it, expect } from 'vitest'
import { cue } from './index'

describe('cue()', () => {
  it('creates a cue with a start time', () => {
    const c = cue(500)
    expect(c.startTime).toBe(500)
  })

  it('creates distinct cue instances', () => {
    const a = cue(500)
    const b = cue(500)
    expect(a).not.toBe(b)
  })

  it('cue at zero is valid', () => {
    const c = cue(0)
    expect(c.startTime).toBe(0)
  })

  it('is not a repeating cue by default', () => {
    const c = cue(500)
    expect(c.interval).toBeUndefined()
  })
})
