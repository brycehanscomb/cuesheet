# cuesheet v0.1 — Design Document

**Date:** 2026-02-21
**Author:** Bryce Hanscomb
**Status:** Approved

## Overview

`cuesheet` is a zero-dependency TypeScript library for sequencing timed events. It provides a declarative API for defining named time markers ("cues") and subscribing callbacks to them, driven by a built-in `requestAnimationFrame` clock.

Extracted from a beer-pouring game (Kirin project) where it orchestrated all animations and interactions on a timeline. The library generalises that pattern into a standalone, publishable package.

## API

### Cue Creation

```typescript
import { cue } from 'cuesheet'

// One-shot cues
const READY = cue(500)       // fires once at 500ms
const GO = cue(1500)         // fires once at 1500ms
const END = cue(5000)        // fires once at 5000ms

// Repeating cues
const PULSE = cue(0).repeats(200)            // every 200ms from 0, forever
const COUNTED = cue(0).repeats(200).times(10) // 10 times then stops
const BOUNDED = cue(1000).repeats(500).until(END) // every 500ms from 1000ms until END
```

`cue(ms)` — factory function returning an opaque Cue value.

`.repeats(intervalMs)` — makes the cue fire periodically from its start time.

`.times(n)` — caps a repeating cue to N firings. Returns a Cue (not chainable further).

`.until(cue)` — caps a repeating cue at another cue's start time. Returns a Cue (not chainable further). Mutually exclusive with `.times()` by API shape — you can only chain one terminator.

### Sheet (Sequencer)

```typescript
import { cuesheet } from 'cuesheet'

const sheet = cuesheet()

// Subscribe — subscribing implicitly schedules the cue
const unsub = sheet.on(READY, () => console.log('ready'))
sheet.once(GO, () => console.log('go!'))

// Playback
sheet.play()
sheet.pause()
sheet.seek(2000)        // jump to 2000ms
sheet.currentTime       // readonly getter

// Cleanup
sheet.destroy()         // stops rAF, clears all listeners
```

No explicit `schedule()` call. Subscribing with `on()`/`once()` is scheduling.

No public `emit()`. Cue firing is internal to the rAF clock.

### Complete Public Surface

| Export | Type | Description |
|---|---|---|
| `cue(ms)` | factory | Create a one-shot cue at a timestamp |
| `.repeats(ms)` | chain | Make cue repeat at interval |
| `.times(n)` | terminator | Limit repeat count |
| `.until(cue)` | terminator | Limit repeat to boundary cue |
| `cuesheet()` | factory | Create a sequencer instance |
| `.on(cue, cb)` | method | Subscribe, returns unsub function |
| `.once(cue, cb)` | method | Subscribe once, auto-unsubs |
| `.play()` | method | Start/resume the rAF clock |
| `.pause()` | method | Pause the clock |
| `.seek(ms)` | method | Jump to a time position |
| `.currentTime` | getter | Current playback time in ms |
| `.destroy()` | method | Stop clock, clear all listeners |

## Architecture

### Clock

Built-in `requestAnimationFrame` loop. Each frame:
1. Calculate elapsed time since play started (adjusted for pauses/seeks)
2. Check all registered cues against current time
3. Fire callbacks for any cues whose time has been reached since last frame
4. For repeating cues, calculate if any interval ticks occurred since last frame

### Cue Resolution

- One-shot cues: fire once when `currentTime >= cue.startTime` (and haven't fired yet)
- Repeating cues: fire for each interval tick between previous frame time and current frame time
- `.until()` boundaries are resolved at creation time — the cue stores the boundary's ms value, not a live reference
- `.times()` counts are tracked per-sheet (same cue in two sheets has independent counts)

### Memory Model

- `Map<Cue, Set<Callback>>` for listeners (same as Kirin)
- `Set<Cue>` for tracking which one-shot cues have fired
- Repeating cue state (last fire time, count) tracked in a parallel Map
- `destroy()` clears all maps and cancels the rAF

## Changes from Kirin Implementation

| Kirin | cuesheet | Why |
|---|---|---|
| `director` singleton | `cuesheet()` factory | Multiple independent instances |
| GSAP `timeline.call()` | Built-in rAF clock | Zero dependencies |
| `new Cue(ms)` class | `cue(ms)` factory | Simpler, enables chaining |
| `director.emit(cue)` | Private internal | Not needed in public API |
| `scheduleCues(module)` | Dropped | Subscribing is scheduling |
| `.seconds` getter | Dropped | GSAP-specific |
| No cleanup | `.destroy()` | Proper lifecycle |
| No repeating cues | `.repeats().times().until()` | New feature |
| No seek | `.seek(ms)` | New feature |

## Project Structure

```
~/Dev/cuesheet/
├── src/
│   └── index.ts              # Library source (single file)
├── demo/
│   ├── index.html            # Demo page (GitHub Pages)
│   └── demo.ts               # Demo logic
├── dist/                     # Built output (tsup)
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── docs/plans/
    └── 2026-02-21-cuesheet-design.md
```

## Build & Publish

- **Build tool:** tsup (ESM + CJS output)
- **TypeScript:** strict mode
- **Package:** zero dependencies, ships type declarations
- **Demo:** vanilla HTML/CSS/JS, imports from `../dist`, hosted on GitHub Pages

## Demo Page

Single `index.html` with three sections:

1. **Interactive Timeline Visualizer** — horizontal timeline bar with cue markers, play/pause, scrubber, cues highlight when they fire
2. **Mini Demo ("Countdown Launch")** — visual countdown sequence (3, 2, 1, launch) driven by a cuesheet instance, showing the library doing something tangible
3. **Code Examples** — 2-3 syntax-highlighted copyable snippets showing basic usage, repeating cues, and playback controls

Tech: vanilla HTML/CSS/JS, dark theme, no framework.
