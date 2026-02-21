# cuesheet v0.1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a zero-dependency TypeScript library for sequencing timed events, with a demo page for GitHub showcase.

**Architecture:** Single `src/index.ts` library file using `requestAnimationFrame` for its clock, built with tsup to ESM+CJS. A `demo/` directory with vanilla HTML for GitHub Pages. Tests with vitest using fake timers.

**Tech Stack:** TypeScript (strict), tsup 8.x (build), vitest 4.x (test), bun (script runner)

**Design doc:** `docs/plans/2026-02-21-cuesheet-design.md`

**Reference implementation:** `~/Dev/26-0559-pour-the-perfect-kirin/src/features/director/` (Kirin game director — GSAP-based predecessor)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `src/index.ts` (empty export placeholder)
- Create: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "cuesheet",
  "version": "0.1.0",
  "description": "Zero-dependency TypeScript library for sequencing timed events",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["cue", "sequencer", "timeline", "animation", "events"],
  "author": "Bryce Hanscomb",
  "license": "MIT",
  "devDependencies": {
    "tsup": "^8.5.1",
    "typescript": "^5.7.0",
    "vitest": "^4.0.18"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
})
```

**Step 4: Create .gitignore**

```
node_modules
dist
```

**Step 5: Create src/index.ts placeholder**

```typescript
export {}
```

**Step 6: Install dependencies and verify build**

Run: `bun install`
Expected: lockfile created, no errors

Run: `bun run build`
Expected: `dist/` created with `index.js`, `index.cjs`, `index.d.ts`

**Step 7: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts .gitignore src/index.ts bun.lock
git commit -m "chore: scaffold project with tsup, vitest, typescript"
```

---

### Task 2: Cue Factory — One-Shot Cues

**Files:**
- Create: `src/index.ts` (replace placeholder)
- Create: `src/index.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/index.test.ts
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
```

**Step 2: Run tests to verify they fail**

Run: `bun run test`
Expected: FAIL — `cue` not exported

**Step 3: Write minimal implementation**

```typescript
// src/index.ts
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
```

**Step 4: Run tests to verify they pass**

Run: `bun run test`
Expected: all 4 tests PASS

**Step 5: Commit**

```bash
git add src/index.ts src/index.test.ts
git commit -m "feat: add cue() factory for one-shot cues"
```

---

### Task 3: Cue Factory — Repeating Cues

**Files:**
- Modify: `src/index.test.ts` (add tests)
- No implementation changes expected (already built in Task 2)

**Step 1: Write the failing tests**

Add to `src/index.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they pass (or fix if needed)**

Run: `bun run test`
Expected: Tests for `.times()`/`.until()` returning Cue without terminators may fail — terminated cues still have `.repeats()` on them. Fix by removing `.repeats()` from terminated cue objects (return plain objects without the method).

**Step 3: Fix terminated cue shape if needed**

Update the `times()` and `until()` return values in `src/index.ts` to not include `.repeats()`, `.times()`, or `.until()` methods — just return `{ startTime, interval, maxCount, untilTime }`.

**Step 4: Run tests to verify all pass**

Run: `bun run test`
Expected: all PASS

**Step 5: Commit**

```bash
git add src/index.ts src/index.test.ts
git commit -m "feat: add repeating cues with .times() and .until() terminators"
```

---

### Task 4: CueSheet — Lifecycle and Playback

**Files:**
- Modify: `src/index.ts` (add `cuesheet()` factory)
- Modify: `src/index.test.ts` (add tests)

**Step 1: Write the failing tests**

Add to `src/index.test.ts`:

```typescript
import { cue, cuesheet } from './index'

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
```

**Step 2: Run tests to verify they fail**

Run: `bun run test`
Expected: FAIL — `cuesheet` not exported

**Step 3: Write minimal implementation**

Add to `src/index.ts`:

```typescript
export interface CueSheet {
  readonly currentTime: number
  on(cue: Cue, cb: () => void): () => void
  once(cue: Cue, cb: () => void): () => void
  play(): void
  pause(): void
  seek(timeMs: number): void
  destroy(): void
}

export function cuesheet(): CueSheet {
  let time = 0
  let playing = false
  let rafId: number | null = null
  let lastFrameTime: number | null = null
  const listeners = new Map<Cue, Set<() => void>>()
  const firedOneShots = new Set<Cue>()
  const repeatState = new Map<Cue, { lastFireTime: number; count: number }>()

  function tick(frameTime: number) {
    if (!playing) return
    if (lastFrameTime === null) lastFrameTime = frameTime
    const delta = frameTime - lastFrameTime
    lastFrameTime = frameTime
    const prevTime = time
    time += delta
    processCues(prevTime, time)
    rafId = requestAnimationFrame(tick)
  }

  function processCues(prevTime: number, currentTime: number) {
    for (const [c, cbs] of listeners) {
      if (c.interval != null) {
        processRepeatingCue(c, cbs, prevTime, currentTime)
      } else {
        if (!firedOneShots.has(c) && currentTime >= c.startTime) {
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
      lastFrameTime = null
      rafId = requestAnimationFrame(tick)
    },
    pause() {
      playing = false
      if (rafId != null) cancelAnimationFrame(rafId)
      rafId = null
      lastFrameTime = null
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
      if (rafId != null) cancelAnimationFrame(rafId)
      rafId = null
      listeners.clear()
      firedOneShots.clear()
      repeatState.clear()
    },
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `bun run test`
Expected: all PASS

**Step 5: Commit**

```bash
git add src/index.ts src/index.test.ts
git commit -m "feat: add cuesheet() factory with playback controls"
```

---

### Task 5: CueSheet — One-Shot Cue Firing

**Files:**
- Modify: `src/index.test.ts` (add tests)

Tests use `vi.useFakeTimers()` to control rAF. Vitest's fake timers include rAF support.

**Step 1: Write the failing tests**

Add to `src/index.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
```

**Step 2: Run tests**

Run: `bun run test`
Expected: These may pass if fake timers correctly drive rAF. If vitest's `advanceTimersByTime` doesn't trigger rAF callbacks, we may need to use `vi.advanceTimersToNextTimer()` in a loop instead. Debug and adjust.

**Step 3: Fix timer approach if needed**

If `advanceTimersByTime` doesn't trigger rAF, replace with:
```typescript
// Helper to advance rAF-based time
function advanceFrames(ms: number) {
  const frames = Math.ceil(ms / 16)
  for (let i = 0; i < frames; i++) {
    vi.advanceTimersByTime(16)
  }
}
```

**Step 4: Run tests to verify all pass**

Run: `bun run test`
Expected: all PASS

**Step 5: Commit**

```bash
git add src/index.test.ts
git commit -m "test: one-shot cue firing with fake timers"
```

---

### Task 6: CueSheet — Repeating Cue Firing

**Files:**
- Modify: `src/index.test.ts` (add tests)

**Step 1: Write the failing tests**

```typescript
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
```

**Step 2: Run tests**

Run: `bun run test`
Expected: PASS (implementation already handles repeating cues from Task 4)

**Step 3: Adjust implementation if any edge cases fail**

Fix any off-by-one issues in `processRepeatingCue`.

**Step 4: Commit**

```bash
git add src/index.test.ts
git commit -m "test: repeating cue firing with .times() and .until()"
```

---

### Task 7: CueSheet — Seek and Pause Behavior

**Files:**
- Modify: `src/index.test.ts` (add tests)

**Step 1: Write the failing tests**

```typescript
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
    // (seek doesn't retroactively fire cues)
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
```

**Step 2: Run tests**

Run: `bun run test`

**Step 3: Fix any failing behaviors**

Key edge case: `seek()` forward should mark time but NOT retroactively fire cues between old time and new time. The `processCues` function checks `prevTime → currentTime` range, so after a seek forward we need to ensure `prevTime` is set to the seek target.

**Step 4: Commit**

```bash
git add src/index.test.ts src/index.ts
git commit -m "test: seek and pause behavior"
```

---

### Task 8: Build Verification and Package Exports

**Files:**
- No new files — verify build output and exports

**Step 1: Run full test suite**

Run: `bun run test`
Expected: all PASS

**Step 2: Run build**

Run: `bun run build`
Expected: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` created

**Step 3: Verify type declarations include all exports**

Run: `cat dist/index.d.ts`
Expected: exports for `cue`, `cuesheet`, `Cue`, `CueSheet`, `RepeatingCue`

**Step 4: Commit**

```bash
git commit --allow-empty -m "chore: verify build output and type declarations"
```

---

### Task 9: Demo Page — HTML Shell and Timeline Visualizer

**Files:**
- Create: `demo/index.html`
- Create: `demo/demo.ts`
- Modify: `tsup.config.ts` (add demo entry)

**Step 1: Add demo build entry**

Update `tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
  },
  {
    entry: ['demo/demo.ts'],
    outDir: 'demo/dist',
    format: ['esm'],
    bundle: true,
    clean: true,
  },
])
```

**Step 2: Create demo/index.html**

Dark-themed single page with three sections:
1. Timeline visualizer — canvas or DOM-based horizontal bar with cue markers, play/pause button, time scrubber, time display
2. Mini demo area — countdown/launch animation
3. Code examples — pre-formatted code blocks

The HTML should link to `./dist/demo.js` as a module script.

**Step 3: Create demo/demo.ts**

Import from `../src/index.ts` (tsup will bundle it).

Set up:
- A demo cuesheet with ~8 cues (countdown: READY, 3, 2, 1, GO, PULSE, FINISH)
- Timeline visualizer: render cue markers on a horizontal bar, animate a playhead, highlight cues as they fire
- Mini demo: show a countdown number that changes at each cue, rocket/emoji that "launches" at GO
- Wire play/pause/seek controls

**Step 4: Build and verify**

Run: `bun run build`
Expected: `demo/dist/demo.js` created

Open `demo/index.html` in browser and verify:
- Timeline renders with cue markers
- Play starts the sequence
- Cues highlight when fired
- Scrubber seeks to position
- Mini demo shows countdown and launch

**Step 5: Commit**

```bash
git add demo/ tsup.config.ts
git commit -m "feat: add interactive demo page with timeline visualizer"
```

---

### Task 10: Demo Page — Code Examples Section

**Files:**
- Modify: `demo/index.html` (add code examples section)

**Step 1: Add code examples**

Three blocks:

1. **Basic usage** — create cues, subscribe, play
2. **Repeating cues** — pulse with `.times()` and `.until()`
3. **Playback controls** — seek, pause, resume, destroy

Use `<pre><code>` blocks. Minimal syntax highlighting via CSS (keyword coloring with a few rules, or just monochrome — keep it simple for v0.1).

**Step 2: Verify in browser**

Open `demo/index.html`, scroll to code section, verify readability.

**Step 3: Commit**

```bash
git add demo/
git commit -m "feat: add code examples to demo page"
```

---

### Task 11: Final Polish and README

**Files:**
- Create: `README.md`

**Step 1: Write README.md**

Short README with:
- One-line description
- Install command
- Quick usage example (5-10 lines)
- Link to demo page
- API reference table (from design doc)
- License

**Step 2: Add demo/.gitignore**

```
dist
```

**Step 3: Run full test suite and build one more time**

Run: `bun run test && bun run build`
Expected: all pass, build succeeds

**Step 4: Commit**

```bash
git add README.md demo/.gitignore
git commit -m "docs: add README with usage examples and API reference"
```

---

### Task 12: GitHub Repo and Pages Setup

**Step 1: Create GitHub repo**

Run: `cd ~/Dev/cuesheet && gh repo create cuesheet --public --source=. --push`

**Step 2: Enable GitHub Pages**

Configure Pages to serve from `demo/` directory on main branch (or set up a simple deploy).

**Step 3: Verify**

- Repo visible at github.com/brycehanscomb/cuesheet (or similar)
- Demo page accessible via GitHub Pages URL

---

## Summary

| Task | What | Commit |
|---|---|---|
| 1 | Project scaffolding | `chore: scaffold project` |
| 2 | `cue()` factory — one-shot | `feat: add cue() factory` |
| 3 | `cue().repeats().times().until()` | `feat: add repeating cues` |
| 4 | `cuesheet()` factory + lifecycle | `feat: add cuesheet() factory` |
| 5 | One-shot cue firing tests | `test: one-shot firing` |
| 6 | Repeating cue firing tests | `test: repeating firing` |
| 7 | Seek and pause tests | `test: seek and pause` |
| 8 | Build verification | `chore: verify build` |
| 9 | Demo — timeline visualizer | `feat: demo page` |
| 10 | Demo — code examples | `feat: code examples` |
| 11 | README | `docs: README` |
| 12 | GitHub repo + Pages | (remote setup) |
