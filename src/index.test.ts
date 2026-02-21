import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cue, cuesheet } from './index'

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

describe('cue().repeats()', () => {
  it('creates a repeating cue', () => {
    const c = cue(1000).repeats(500)
    expect(c.startTime).toBe(1000)
    expect(c.interval).toBe(500)
  })

  it('repeating cue with .times() cap', () => {
    const c = cue(0).repeats(200).times(10)
    expect(c.interval).toBe(200)
    expect(c.maxCount).toBe(10)
    expect(c.untilTime).toBeUndefined()
  })

  it('repeating cue with .until() boundary', () => {
    const END = cue(5000)
    const c = cue(1000).repeats(500).until(END)
    expect(c.interval).toBe(500)
    expect(c.untilTime).toBe(5000)
    expect(c.maxCount).toBeUndefined()
  })

  it('.times() returns a Cue without .times() or .until()', () => {
    const c = cue(0).repeats(200).times(5)
    expect(c).not.toHaveProperty('times')
    expect(c).not.toHaveProperty('until')
  })

  it('.until() returns a Cue without .times() or .until()', () => {
    const c = cue(0).repeats(200).until(cue(1000))
    expect(c).not.toHaveProperty('times')
    expect(c).not.toHaveProperty('until')
  })
})

describe('cuesheet()', () => {
  it('creates a sheet instance', () => {
    const sheet = cuesheet()
    expect(sheet).toBeDefined()
    expect(sheet.currentTime).toBe(0)
  })

  it('starts paused (currentTime stays 0 without play)', () => {
    const sheet = cuesheet()
    expect(sheet.currentTime).toBe(0)
  })

  it('destroy() does not throw', () => {
    const sheet = cuesheet()
    expect(() => sheet.destroy()).not.toThrow()
  })

  it('seek() sets currentTime', () => {
    const sheet = cuesheet()
    sheet.seek(2000)
    expect(sheet.currentTime).toBe(2000)
  })

  it('pause() does not throw when already paused', () => {
    const sheet = cuesheet()
    expect(() => sheet.pause()).not.toThrow()
  })
})

describe('cuesheet — one-shot cue firing', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('fires a cue when its time is reached', () => {
    const cb = vi.fn()
    const HIT = cue(100)
    const sheet = cuesheet()
    sheet.on(HIT, cb)
    sheet.play()
    vi.advanceTimersByTime(150)
    expect(cb).toHaveBeenCalledOnce()
    sheet.destroy()
  })

  it('does not fire a cue before its time', () => {
    const cb = vi.fn()
    const HIT = cue(500)
    const sheet = cuesheet()
    sheet.on(HIT, cb)
    sheet.play()
    vi.advanceTimersByTime(100)
    expect(cb).not.toHaveBeenCalled()
    sheet.destroy()
  })

  it('fires a cue only once', () => {
    const cb = vi.fn()
    const HIT = cue(100)
    const sheet = cuesheet()
    sheet.on(HIT, cb)
    sheet.play()
    vi.advanceTimersByTime(500)
    expect(cb).toHaveBeenCalledOnce()
    sheet.destroy()
  })

  it('once() auto-unsubscribes after first fire', () => {
    const cb = vi.fn()
    const HIT = cue(100)
    const sheet = cuesheet()
    sheet.once(HIT, cb)
    sheet.play()
    vi.advanceTimersByTime(500)
    expect(cb).toHaveBeenCalledOnce()
    sheet.destroy()
  })

  it('unsubscribe prevents callback', () => {
    const cb = vi.fn()
    const HIT = cue(100)
    const sheet = cuesheet()
    const unsub = sheet.on(HIT, cb)
    unsub()
    sheet.play()
    vi.advanceTimersByTime(500)
    expect(cb).not.toHaveBeenCalled()
    sheet.destroy()
  })

  it('multiple listeners on same cue all fire', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const HIT = cue(100)
    const sheet = cuesheet()
    sheet.on(HIT, cb1)
    sheet.on(HIT, cb2)
    sheet.play()
    vi.advanceTimersByTime(150)
    expect(cb1).toHaveBeenCalledOnce()
    expect(cb2).toHaveBeenCalledOnce()
    sheet.destroy()
  })
})

describe('cuesheet — repeating cue firing', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('fires a repeating cue at each interval', () => {
    const cb = vi.fn()
    const TICK = cue(0).repeats(100)
    const sheet = cuesheet()
    sheet.on(TICK, cb)
    sheet.play()
    vi.advanceTimersByTime(350)
    // Should fire at 0, 100, 200, 300 = 4 times (approx, depends on frame timing)
    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(3)
    sheet.destroy()
  })

  it('.times() limits repetitions', () => {
    const cb = vi.fn()
    const TICK = cue(0).repeats(100).times(3)
    const sheet = cuesheet()
    sheet.on(TICK, cb)
    sheet.play()
    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(3)
    sheet.destroy()
  })

  it('.until() stops at boundary time', () => {
    const cb = vi.fn()
    const END = cue(300)
    const TICK = cue(0).repeats(100).until(END)
    const sheet = cuesheet()
    sheet.on(TICK, cb)
    sheet.play()
    vi.advanceTimersByTime(1000)
    // Should fire at 0, 100, 200, 300 = 4 times max
    expect(cb.mock.calls.length).toBeLessThanOrEqual(4)
    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(3)
    sheet.destroy()
  })

  it('repeating cue with delayed start', () => {
    const cb = vi.fn()
    const TICK = cue(200).repeats(100)
    const sheet = cuesheet()
    sheet.on(TICK, cb)
    sheet.play()
    vi.advanceTimersByTime(150)
    expect(cb).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(1)
    sheet.destroy()
  })
})

describe('cuesheet — seek and pause', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('seek forward skips past cues', () => {
    const cb = vi.fn()
    const HIT = cue(100)
    const sheet = cuesheet()
    sheet.on(HIT, cb)
    sheet.seek(500)
    sheet.play()
    vi.advanceTimersByTime(50)
    // Cue at 100 is in the past after seek — should not fire
    expect(cb).not.toHaveBeenCalled()
    sheet.destroy()
  })

  it('seek backward resets fired cues', () => {
    const cb = vi.fn()
    const HIT = cue(100)
    const sheet = cuesheet()
    sheet.on(HIT, cb)
    sheet.play()
    vi.advanceTimersByTime(200)
    expect(cb).toHaveBeenCalledOnce()
    sheet.pause()
    sheet.seek(0)
    sheet.play()
    vi.advanceTimersByTime(200)
    expect(cb).toHaveBeenCalledTimes(2)
    sheet.destroy()
  })

  it('pause stops time progression', () => {
    const cb = vi.fn()
    const HIT = cue(500)
    const sheet = cuesheet()
    sheet.on(HIT, cb)
    sheet.play()
    vi.advanceTimersByTime(100)
    sheet.pause()
    vi.advanceTimersByTime(1000)
    expect(cb).not.toHaveBeenCalled()
    sheet.destroy()
  })

  it('play after pause resumes from correct time', () => {
    const cb = vi.fn()
    const HIT = cue(200)
    const sheet = cuesheet()
    sheet.on(HIT, cb)
    sheet.play()
    vi.advanceTimersByTime(100)
    sheet.pause()
    vi.advanceTimersByTime(5000)
    sheet.play()
    vi.advanceTimersByTime(150)
    expect(cb).toHaveBeenCalledOnce()
    sheet.destroy()
  })
})
