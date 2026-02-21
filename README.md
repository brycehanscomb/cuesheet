# cuesheet

Zero-dependency TypeScript library for sequencing timed events.

## Install

```bash
npm install cuesheet
```

## Quick Start

```typescript
import { cue, cuesheet } from 'cuesheet'

const READY = cue(0)
const GO    = cue(3000)
const PULSE = cue(3500).repeats(500).times(5)
const END   = cue(6000)

const sheet = cuesheet()

sheet.on(READY, () => console.log('Get ready...'))
sheet.on(GO,    () => console.log('Go!'))
sheet.on(PULSE, () => console.log('Pulse!'))
sheet.on(END,   () => console.log('Done.'))

sheet.play()
```

## API

| Export | Type | Description |
|---|---|---|
| `cue(ms)` | factory | Create a one-shot cue at a timestamp |
| `.repeats(ms)` | chain | Make cue repeat at interval |
| `.times(n)` | terminator | Limit repeat count |
| `.until(cue)` | terminator | Limit repeat to boundary cue |
| `cuesheet()` | factory | Create a sequencer instance |
| `.on(cue, cb)` | method | Subscribe, returns unsub function |
| `.once(cue, cb)` | method | Subscribe once, auto-unsubs |
| `.play()` | method | Start/resume the clock |
| `.pause()` | method | Pause the clock |
| `.seek(ms)` | method | Jump to a time position |
| `.currentTime` | getter | Current playback time in ms |
| `.destroy()` | method | Stop clock, clear all listeners |

## License

MIT
