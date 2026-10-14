# War engine

The rules of the slice (spec sections 1-8, 11, 12) as a pure, deterministic TypeScript port of
`docs/war/reference/*.py`. No DOM, no timers, no randomness outside the seeded streams.
Import everything from `src/war/engine/index.ts`; static data lives in `src/war/content/`.

## Conventions

- **State is plain data.** Score-sized numbers are `bigint` (targets, totals, leverage, Influence,
  Momentum). Funds, counts and traffic are `number`. Do not `JSON.stringify` a state (BigInt); use
  `canonical()` from `hash.ts` if you need text.
- **Actions never mutate.** Every action takes a `RunState` and returns
  `Result = { ok: true, state } | { ok: false, reason, state }`. On success `state` is a new object;
  on refusal it is the same object you passed and `reason` is a short line for a toast
  (`'Pin at least one lit region.'`, `'FULL TABLE: pin exactly 5.'`, `'Not enough Funds.'`,
  `'No free seat. Sell someone first.'`). So `const r = sweep(s.value); s.value = r.state; if (!r.ok) toast(r.reason)`.
- **The UI never recomputes a score.** `preview()` gives the readout; `state.lastSweep.trace` drives
  the scoring animation. A new sweep has happened when `state.lastSweep !== previous.lastSweep`.
- **Seats** are indexes into `state.staff` (0 = leftmost). Empty seats are the slots past
  `staff.length` up to `seatCount` (5). **Tray slots** are indexes into `state.tray` (up to `traySlots`, 2).
- **Momentum** is held in tenths (`M10`): show it with `formatM10` / `formatM10Short`.
- Region ids are the three-letter codes in `content/map.json` (`'LNK'`).

## Starting

| Function | What it does |
| --- | --- |
| `newRun(seed, opts?)` | A new night at 22:00 Flare-up (300). Seed `'FIRST-NIGHT'` gives the scripted deal and first Briefing. `opts.sandbox` = `'late' \| 'mid'` starts a sandbox. |
| `newSandbox('late' \| 'mid', seed?)` | LATE SHIFT (OVERTIME 10:00 Flare-up, 600,000,000, Herald / Governor / Signals / Deputy / Sovereign, ◆40) or MID SHIFT (01:00 Standoff, 9,000, Harbourmaster / Hotline / Strategist). The slice ends after that Hour's Summit. |
| `FIRST_NIGHT_SEED`, `FIRST_NIGHT_PILE` | `'FIRST-NIGHT'` and its opening pile (LNK GUL SHL EDV QLN NWK ICW HRT, then FRM WNM WMS). |

## Actions (all return `Result`)

| Function | Phase | What it does |
| --- | --- | --- |
| `pin(s, id)` / `unpin(s, id)` / `togglePin(s, id)` | crisis | Pin a lit region (max 5, Airlift pin included) / lift it. Lifting the Airlift pin returns the AIRLIFT paper to the tray. |
| `clearPins(s)` | crisis | Lift every pin. |
| `sweep(s)` | crisis | Score the pins, commit (traffic +1 on joins in the scoring set, Old Hand +5, glow), add to the total, spend the pins, refill to 8. Then CLEAR (payout, brass pin on `topRegion`, phase `briefing` or `sliceEnd`), MISS (4th sweep below target: phase `missed`) or carry on. Sets `lastSweep` (and `lastClear` on a clear). |
| `swap(s)` | crisis | The pinned lit regions are spent and new ones light (uses a swap; the Airlift pin stays). |
| `nextCrisis(s)` | briefing | Leave the Briefing and deal the next crisis; after a Summit the next Hour starts (targets and its Summit twist are drawn then). |
| `keepGoing(s)` | sliceEnd | KEEP GOING: opens a Briefing; then 01:00 is 6,000 / 9,000 / 12,000 and each Hour after is x2.2 with a random Summit twist. |
| `buyOffer(s, slot)` | briefing | Buy offer 0 or 1. Staff take the leftmost free seat, Orders a tray slot, Playbooks apply at once (+1 level). |
| `reroll(s)` | briefing | Reroll both offers: ◆4, then 5, 6 ...; resets each Briefing. |
| `buyFolder(s)` / `pickFromFolder(s, i)` / `skipFolder(s)` | briefing | Pay ◆4 to open the folder; take card 0-2 (needs a free seat / tray slot) or skip. |
| `sellStaff(s, seat)` / `sellPaper(s, slot)` | crisis, briefing | Sell for the listed value (staff floor(price/2), Orders ◆1). |
| `moveSeat(s, from, to)` | crisis, briefing | Drag a staff to another seat; the others slide aside. |
| `armOrder(s, slot)` | crisis, briefing | Arm the paper in `slot` (again to disarm). AIRLIFT only during a crisis. |
| `tapArmed(s, id)` | armed | Choose a target (tap a chosen one to un-choose). Applies itself when the last target is chosen. |
| `confirmArmed(s)` / `disarm(s)` | armed | Apply with fewer targets (FORTIFY, RETIRE, DEFECT 'up to 2') / cancel. |
| `useOrder(s, slot, targets)` | crisis, briefing | Apply an Order in one go (bots, drag gestures). DEFECT: `[source, a, b?]`. LAY CABLE: `[from, to]`. |

Checks that return a reason or `null`: `sweepProblem`, `swapProblem`, `offerProblem(s, slot)`,
`folderProblem`, `pickProblem(s, i)`, `paperProblem(s, slot)`, `canConfirmArmed` (boolean).
The actions use the same checks, so a `null` means the action will succeed.

## Reading the state (views)

| Function | Returns |
| --- | --- |
| `preview(s)` | The readout for the current pins: `pattern`, `name`, `level`, base `influence` / `m10`, `scoringSet` (sweep order), `sweepOrder` (`{LNK: 2}`), `loose` (grey pins), `ringed` (Surround), `joins` (pairs to draw as threads while choosing), `biggestGroup` (largest joined group among the pins), `firingSeats` (lift on the rail), `clears` (the CLEARS lamp), `canSweep` / `sweepReason`, `canSwap` / `swapReason`, and `leverage` (silent: never display it). `pattern: null` when nothing is pinned. Cached per state. |
| `boardLabels(s)` | Big Board: `clock` ('23:00'), `hour` ('23:00' or 'OVERTIME 10:00'), `overtime`, `crisis` ('STANDOFF'), `crisisKind`, `crisisIndex` (0-2, for the dots), `summitChip` ('SUMMIT: BLACKOUT'), `twist`, `twistRule`, `twistNow`, `target`, `total`, `sweepsLeft`, `swapsLeft`, `funds`. |
| `regionViews(s)` | `Record<RegionId, RegionView>` exactly as `src/war/ui/map/contract.ts` wants (colour after DEFECT, status lit / dark / spent / retired, pinned, airlift, capital incl. PROMOTE and the Herald, port incl. cables, stamp, brass, glow). |
| `threadViews(s)` | `ThreadView[]` for every join with traffic. |
| `mapFlags(s)` | `{ gridlock, ferry, blackout }` for the map right now. |
| `ringFactor(s)` / `progress(s)` | Flashpoint ring factor `max(0, 1 - total/target)` and its complement for the progress rule. |
| `seatViews(s)` | Per seat: `uid`, `id`, `name`, `object`, `rule`, `chip` (Old Hand's live count filled in), `count`, `rarity`, `sell`, `copies` (what a Deputy copies now). |
| `trayViews(s)` | Per paper: `slot`, `uid`, `id`, `name`, `rule`, `sell`, `armed`, `reason` (why it can't be armed now). |
| `armedView(s)` | The armed Order: `order`, `name`, `chosen`, `valid` (regions to highlight), `kind` ('tap' \| 'drag'), `prompt` ('Tap up to 2 regions.'), `canConfirm`. |
| `shopView(s)` | The Briefing: `offers` (card + `price` + `reason`), `folder` (`name`, `rule`, `price`, `status`, `reason`, `cards` with reasons), `rerollCost`, `canReroll`, `next` (see below). `null` outside a Briefing. |
| `nextCrisisInfo(s)` | `{ hour, crisis, kind, target, newHour }` for 'BRIEFING · next: STANDOFF 1,350'. |
| `endLabels(s)` | `{ title, line }`: 'THE WORLD TIPPED' / '23:00 STANDOFF', or 'END OF SLICE' / 'YOU HELD UNTIL 01:00'. |
| `patternTable(s)` | Run Info: 11 rows (`name` '???' and `hidden` for secrets not yet made, `level`, `influence`, `momentum`, `made`, `shape`). |
| `actsOn(s, offer)` | Regions an offer (or `{kind: 'staff', id}`) acts on, for the long-press highlight. |
| `litHasJoin(s)` | Any two lit regions joined (for the 'Nothing joins?' hint). |
| `isCapital(s, id)`, `isPort(s, id)`, `twistInForce(s)` | Rules as they stand now. |
| `scorePins(s, pins, {trace})` | Score any selection silently (bots). Returns a `ScoreResult` or `null` for no pins. |

## The sweep trace

`state.lastSweep.trace: TraceEvent[]`, in animation order:

```
{ i, phase, region?, other?, seat?, staffId?, op, amount, I, M10, ...extras }
phase: 'pattern' | 'pin' | 'thread' | 'stamp' | 'staff' | 'again' | 'standby' | 'desk' | 'slam'
op:    'base' | '+I' | '+M' | 'xM' | 'again' | 'slam'
```

- `I` and `M10` are the running values after the event (strings of BigInt). `amount` is the
  human-sized change: Influence for `+I`, whole Momentum for `+M` (`'4'`), the factor for `xM`
  (`'1.5'`, `'2'`, `'3'`), the leverage for `slam`, base Influence for `pattern`.
- `pattern` carries `pattern` and `level`. `pin` / `stamp` / `staff` / `again` carry `step` (index of
  the pin in sweep order) and `pass` (0, then 1.. for each AGAIN). `again` carries `reason`
  (`flashpoint` / `echo` / `courier` / `signals`) and, for staff, the `seat`.
- `thread`: `region` is the pin scoring now, `other` the pin already scored; emitted for every
  joined earlier pin, with `amount '0'` when there is no traffic yet (pulse, no pop). With the Rail
  Clerk it carries the clerk's `seat`.
- `staff` / `desk` / `standby`: `seat` is the seat that fires; `staffId` the rule applied
  (a Deputy shows the copied id with `viaDeputy: true`).
- BLACKOUT: a blacked-out scoring pin gives one `pin` event with `dark: true` and `amount '0'`.
- `SweepRecord` also has `leverage`, `pattern`, `level`, `scoringSet`, `topRegion`, `totalBefore`,
  `totalAfter`, `target`, `cleared`, `baseInfluence`, `baseM10`, `influence`, `m10`, `ringed`,
  `threads`, `pins`, `hour`, `crisisIndex`.

## State shape (`RunState`)

```
seed, mode ('run' | 'late' | 'mid'), firstNight
phase: 'crisis' | 'briefing' | 'missed' | 'sliceEnd'
hour: { index (0 = 22:00), targets: [flare, standoff, summit] (bigint), twist: { kind, colour } }
sliceEndHour: number | null
funds, seatCount (5), traySlots (2)
staff: [{ uid, id, count }]          seat order
tray:  [{ uid, id }]                 Orders
world: {
  colour: {id: Colour}, promoted: id[], cables: [a, b][], stamps: {id: 'FORTIFY'|'RELAY'|'ECHO'},
  brass: {id: n}, traffic: {'AAA|BBB': n}, retired: id[], levels: {PatternId: n}, scored: {id: n}
}
crisis: {
  hour, index (0-2), kind ('FLARE_UP'|'STANDOFF'|'SUMMIT'), target, total, sweepsLeft, swapsLeft,
  flashpoint, pile, lit, spent, pins, airlift, airliftPaper, sweeps: SweepSummary[], cleared
}
shop: { briefing, offers: (Offer | null)[2], folder: { kind, price, contents, status }, rerollCost } | null
armed: { slot, order, chosen } | null
lastSweep: SweepRecord | null        (with the trace)
lastClear: { reward, unusedSweeps, interest, overwhelm, treasurer, payout, fundsBefore, fundsAfter, brass } | null
best: { leverage, pattern, level, pins, scoringSet, hour, crisisIndex } | null   best sweep of the run
log: [{ hour, crisisIndex, kind, target, total, sweepsUsed, cleared, bestPattern, bestLeverage }]
made: {PatternId: n}                 patterns made this run (secrets show once made)
sweepsTaken, briefings, nextUid, rng: { deal, shop, twist }
```

The crisis object stays after a clear or a miss, so the Briefing and the end screens can still draw
the night map.

## Formatting

| Function | Example |
| --- | --- |
| `formatInt(n)` | `10920n` -> `'10,920'` |
| `formatShort(n, maxGlyphs = 7)` | Big Board total: `'10,920'`, `'1.24M'`, `'10.6B'`, `'1.23e25'`, `'GOOGOL'`; never more than `maxGlyphs` glyphs (use 5 or 6 for the readout boxes). |
| `formatM10(m10)` / `formatM10Short(m10, max = 5)` | `45n` -> `'4.5'`, `12345n` -> `'1,234.5'`; short: `'29.0M'`. |
| `formatFunds(n, {spaced})` | `'◆3'`, `'◆ 11'` |
| `hourLabel(h)`, `clockOf(h)`, `CRISIS_NAME`, `TWIST_NAME`, `twistRule(t)` | `'OVERTIME 10:00'`, `'10:00'`, `'FLARE-UP'`, `'FULL TABLE'`, `'Sea lanes and cables are cut.'` |

## Determinism

`hashTrace(events)` and `hashState(s)` give an 8-hex-digit FNV-1a hash of a canonical encoding. The
same seed and the same actions give the same hashes everywhere (all arithmetic is integer or BigInt;
the only randomness is `src/engine/rng.ts` forked into `deal`, `shop` and `twist`).

## Rulings where the spec is silent

- The pattern is the candidate with the largest base Influence x base Momentum at its level (ties to the
  higher rung). Link with two pairs scores the heavier pair (ties: the one further west).
- AIRLIFT targets a region still in the pile (status `dark`); one per sweep; lifting the pin returns
  the paper; a SWAP keeps it; it is spent after the sweep.
- RETIRE can't take the flashpoint or a pinned region mid-crisis; a retired lit region is replaced at
  once; the map keeps at least 12 regions. DEFECT targets must differ in colour from the source.
  A stamp Order on a region that already has that stamp is refused; any other stamp is replaced.
- BLACKOUT also stops blacked-out lit Capitals from triggering the Chief of Staff (spec 7: 'trigger nothing').
- A Deputy copying the Treasurer also pays +4 Funds on a clear.
- Shop: offers and folder never repeat a seated staff or each other; an empty rarity falls back down,
  then up. Orders folders hold 3 different Orders.

## Tests

`npx vitest run src/war/engine src/war/content`. `fixtures/reference-cases.json` holds 1,200 random
positions scored by the Python reference (regenerate with `fixtures/gen-reference-cases.py`); the
TypeScript engine must agree on every leverage, pattern, scoring set and top region.
