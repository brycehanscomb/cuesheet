export interface Cue {
  readonly startTime: number
  readonly interval?: number
  readonly maxCount?: number
  readonly untilTime?: number
  repeats(intervalMs: number): RepeatingCue
}

export interface RepeatingCue extends Cue {
  times(n: number): Cue
  until(boundary: Cue): Cue
}

export function cue(startTimeMs: number): Cue {
  return {
    startTime: startTimeMs,
    interval: undefined,
    maxCount: undefined,
    untilTime: undefined,
    repeats(intervalMs: number): RepeatingCue {
      return repeatingCue(startTimeMs, intervalMs)
    },
  }
}

export interface CueSheet {
  readonly currentTime: number
  on(cue: Cue, cb: () => void): () => void
  once(cue: Cue, cb: () => void): () => void
  play(): void
  pause(): void
  seek(timeMs: number): void
  destroy(): void
}

const TICK_MS = 16

export function cuesheet(): CueSheet {
  let time = 0
  let playing = false
  let timerId: ReturnType<typeof setTimeout> | null = null
  let lastTickTime: number | null = null
  const listeners = new Map<Cue, Set<() => void>>()
  const firedOneShots = new Set<Cue>()
  const repeatState = new Map<Cue, { lastFireTime: number; count: number }>()

  function tick() {
    if (!playing) return
    const now = Date.now()
    if (lastTickTime === null) lastTickTime = now
    const delta = now - lastTickTime
    lastTickTime = now
    const prevTime = time
    time += delta
    processCues(prevTime, time)
    timerId = setTimeout(tick, TICK_MS)
  }

  function processCues(prevTime: number, currentTime: number) {
    for (const [c, cbs] of listeners) {
      if (c.interval != null) {
        processRepeatingCue(c, cbs, prevTime, currentTime)
      } else {
        if (!firedOneShots.has(c) && prevTime < c.startTime && currentTime >= c.startTime) {
          firedOneShots.add(c)
          cbs.forEach((cb) => cb())
        }
      }
    }
  }

  function processRepeatingCue(
    c: Cue,
    cbs: Set<() => void>,
    prevTime: number,
    currentTime: number,
  ) {
    if (currentTime < c.startTime) return
    const endTime = c.untilTime ?? Infinity
    if (prevTime >= endTime) return

    let state = repeatState.get(c)
    if (!state) {
      state = { lastFireTime: c.startTime - c.interval!, count: 0 }
      repeatState.set(c, state)
    }

    let nextFire = state.lastFireTime + c.interval!
    while (nextFire <= currentTime && nextFire <= endTime) {
      if (c.maxCount != null && state.count >= c.maxCount) break
      state.lastFireTime = nextFire
      state.count++
      cbs.forEach((cb) => cb())
      nextFire += c.interval!
    }
  }

  function on(c: Cue, cb: () => void): () => void {
    if (!listeners.has(c)) listeners.set(c, new Set())
    listeners.get(c)!.add(cb)
    return () => { listeners.get(c)?.delete(cb) }
  }

  function once(c: Cue, cb: () => void): () => void {
    const unsub = on(c, () => {
      unsub()
      cb()
    })
    return unsub
  }

  return {
    get currentTime() { return time },
    on,
    once,
    play() {
      if (playing) return
      playing = true
      lastTickTime = null
      timerId = setTimeout(tick, TICK_MS)
    },
    pause() {
      playing = false
      if (timerId != null) clearTimeout(timerId)
      timerId = null
      lastTickTime = null
    },
    seek(timeMs: number) {
      const prevTime = time
      time = timeMs
      if (timeMs < prevTime) {
        firedOneShots.clear()
        repeatState.clear()
      }
    },
    destroy() {
      playing = false
      if (timerId != null) clearTimeout(timerId)
      timerId = null
      listeners.clear()
      firedOneShots.clear()
      repeatState.clear()
    },
  }
}

function repeatingCue(startTimeMs: number, intervalMs: number): RepeatingCue {
  return {
    startTime: startTimeMs,
    interval: intervalMs,
    maxCount: undefined,
    untilTime: undefined,
    repeats(_: number): RepeatingCue {
      throw new Error('Already repeating')
    },
    times(n: number): Cue {
      return {
        startTime: startTimeMs,
        interval: intervalMs,
        maxCount: n,
        untilTime: undefined,
        repeats(_: number): RepeatingCue {
          throw new Error('Already terminated')
        },
      }
    },
    until(boundary: Cue): Cue {
      return {
        startTime: startTimeMs,
        interval: intervalMs,
        maxCount: undefined,
        untilTime: boundary.startTime,
        repeats(_: number): RepeatingCue {
          throw new Error('Already terminated')
        },
      }
    },
  }
}
