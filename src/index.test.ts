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
