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
