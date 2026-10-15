# War engine: WIN THE WORLD

The rules of `docs/war/v2/SPEC.md` (sections 1, 5, 6, 7, 13) as a pure, deterministic TypeScript port of
`docs/war/v2/reference/rules.py`. No DOM, no timers, no randomness outside the seeded streams
(`src/engine/rng.ts`, forked into `war`, `crisis`, `deal`, `shop`). Import everything from
`src/war/engine/index.ts`; static data lives in `src/war/content/` (`map.ts`, `staff.ts`).

## Conventions

- **State is plain data.** Score-sized numbers are `bigint` (POINTS, M10, scores, targets); coins, counts and
  turns are `number`. Do not `JSON.stringify` a state yourself: use `saveGame` / `loadGame`, or `canonical()`.
- **Actions never mutate.** Each takes a `GameState` and returns
  `Result = { ok: true, state } | { ok: false, reason, state }`. On refusal `state` is the object you passed and
  `reason` is a short plain line for a toast (`'Pin a region that touches your pins.'`, `'Not enough coins.'`).
  So: `const r = send(s.value); s.value = r.state; if (!r.ok) toast(r.reason)`.
- **The UI never computes a score.** The views below carry every number on screen; `state.lastSend` (with its
  `trace`) drives the cascade. A new send has happened when `state.lastSend !== previous.lastSend`.
- **Views are memoised per state object**, so calling them on every render is cheap.
- **Seats** are indexes into `state.seats` (0 = leftmost; empty seats are the slots past `seats.length`, up to 5).
  **Offer slots** are indexes 0-2 into `state.shop.offers` (null once hired).
- **The multiplier is held in tenths** (`m10`, 10 = x1.0). Show it with `formatM10` (always one decimal: `'4.0'`).
- Region ids are the three-letter codes of `content/map.json` (`'LNK'`). `IDS` is the 30 ids sorted, the order
  every tie-break and every fixture uses.

## The turn, as phases

```
newGame ─► 'choose' ──pin/unpin/swap──► send ─┬─► 'outcome' ──nextTurn──► 'choose' (turn + 1)
                                              ├─► 'shop' (after turns 2, 4, 6 ...) ──buy/sell/reroll/moveSeat──► nextTurn ──► 'choose'
                                              └─► 'over' (ending: 'WORLD UNITED' | 'CEASEFIRE' | 'WAR')
```

`send` resolves the whole turn at once: the outcome on the map, war spreading by itself after turns 3, 6, 9 ...,
the Old Hand's growth and the end check, then opens the shop when one is due. Play the cascade from
`state.lastSend` before showing the new phase. In `'outcome'` the UI calls `nextTurn` itself once the animation ends.

## Starting

| Function | What it does |
| --- | --- |
| `newGame(seed, { firstWorld?, demo? })` | A new game, dealt: phase `'choose'`, turn 1. `firstWorld: true` (or the seed `'FIRST-WORLD'`) gives the scripted first game (war on Dunmarrow, Orrinth, Floe End; turns 1-2 and the first shop fixed; SWAP off on turn 1). `demo: 'crown'` loads the CROWN demo: Example 3 at turn 14 (seats Duty Officer, Deputy, Sovereign, Harbourmaster, Herald; ◆6; crisis Lintel); pinning `CROWN.pins` (in a tappable order) scores 5,598,720 and wins 7. |
| `FIRST_WORLD`, `FIRST_WORLD_SEED`, `CROWN`, `CROWN_SEED` | The scripted data (`seeds.ts`). |

## Actions (all return `Result`)

| Function | Phase | What it does |
| --- | --- | --- |
| `pin(s, id)` | choose | Pin a lit region or the crisis that touches a pin (or the first pin). Max 5. |
| `unpin(s, id)` | choose | Lift a pin, plus every pin no longer touching the group of the earliest remaining pin (tap order). |
| `togglePin(s, id)` | choose | `unpin` if pinned, else `pin`. |
| `clearPins(s)` | choose | Lift every pin. |
| `swap(s)` | choose | Once a turn: unpinned lit regions go dark to the bottom of the pile, as many light from the top; pins stay. |
| `send(s)` | choose | Score, resolve, spread, check, then `'outcome'`, `'shop'` or `'over'`. Sets `lastSend`. |
| `nextTurn(s)` | outcome, shop | Close the shop and deal turn t + 1. |
| `buy(s, slot, replaceSeat?)` | shop | Hire offer `slot` into the leftmost free seat, or in place of `replaceSeat` (that staff sells first, for half its price, rounded down). |
| `sell(s, seat)` | shop | Sell for half the price, rounded down. Selling the Old Hand resets it to x1.0. |
| `reroll(s)` | shop | 3 new offers: ◆2, then ◆3, ◆4 ... in the same visit; back to ◆2 next visit. |
| `moveSeat(s, from, to)` | choose, outcome, shop | Drag a staff to another seat; the others slide aside. |
| `setOwners(s, owners)` | any | Dev hook `setOwner`: a 30-char string (`'.'` grey, `'G'` gold, `'R'` war, in `IDS` order) or a partial map. Re-deals the current turn on the new map; all gold ends WORLD UNITED, war at 10 ends WAR. |

Checks that return a reason or `null` (the actions use the same checks): `sendProblem(s)`, `swapProblem(s)`,
`buyProblem(s, slot, replaceSeat?)`.

## Views (for the screens)

| Function | Returns |
| --- | --- |
| `goalView(s)` | Big Board: `gold`, `red`, `grey`, `goldGoal` (30), `warLimit` (10), `warNext: {id, turns} \| null` (turns 3, 2, 1), `warTag` (`'WAR · 2 TURNS'`, `'WAR · THIS TURN'`), `finalPush`, `after: {gold, red} \| null` (the ghost segments for the current pins). |
| `mapView(s)` | The whole `MapView` of `ui/map/contract.ts` (`regions`, `joinedPins` west to east, `crisis: {id, target: '1,100', doubled}`, `warNext`, `ceased`, `pinOrder`; `highlight`, `finger`, `hover` are null for the UI to set on a copy). |
| `regionViews(s)` | `Record<RegionId, RegionView>`: `owner`, `lit` (in this turn's deal; outside `'choose'` nothing is lit, so the map shows the plain world), `pinned`, `addable` (the tap rule), `joinable` (addable with a pin down), `capital`, `port`, `preview` (`{kind: 'win', order}` 1..k in spread order, or `{kind: 'war', order: 1}` on the crisis for a miss; none for a push miss), `brass`. |
| `preview(s)` | `LivePreview \| null` for the current pins: `pins` (tap order), `order` (west to east), `points`, `m10`, `score`, `regions` (the ladder's count capped by the regions left to win, so it matches what SEND does), `wins` (ids in spread order), `unites` (the send would make all 30 gold), `nextMark`, `short`, `doubled`, `firing` (seats that will fire). |
| `readoutView(s)` | `target`, `targetText` (`'1,100'`), `line` (`'NEED 1,100'` / `'NEXT REGION AT 4,400'` / `'UNITES THE WORLD'` when nothing is left beyond), `nextMark`, `regions`, `points`, `m10`, `pointsText`, `multiplierText` (`'1,381.4'`), `score`, `nearNext` (within 10% below the next mark). Outside `'choose'` it shows the last send. |
| `sendLabel(s)` | `{ text, tone, enabled, regions }`: `'WINS 2 REGIONS'` (`win`), `'MISS · SHORT BY 620'` / `'MISS · CEASEFIRE'` (`miss`), `'PIN A REGION'` (`off`, disabled); `''` outside a turn. |
| `controlsView(s)` | `swap: {enabled, sub ('1 left' \| 'used' \| 'next turn' \| 'none left'), reason}`, `coins`, `coinsText` (`'◆ 7'`), `send` (the label). |
| `seatViews(s)` | Per seated staff: `seat`, `uid`, `id`, `name`, `object`, `rule`, `price`, `sell`, `sellText` (`'SELL ◆3'`), `chip` (live: Surveyor `'+7'`, Old Hand `'×1.4'`), `chipLines` (`['ALL PINS', '★ ⚓']`, `['COPY', '→ Sovereign']`), `tone` (`'points'` cyan / `'multiplier'` amber; a Deputy takes its copy's), `copies`, `isNew` (hired since the last send). |
| `shopView(s)` | `null` outside the shop. `visit`, `nextTarget`, `title` (`'SHOP · NEXT TARGET 1,600'`), `offers[3]` (`slot`, `id` (null once hired), `name`, `object`, `rule`, `price`, `priceText`, `affordable`, `affordableWithSale`, `reason`, `preview` (`{before, after, seat, replaces, text: '390 → 2,343', beforeText, afterText}`), `replace` (full table only: per seat `{seat, after, text, affordable}`)), `reroll: {cost, text: 'REROLL ◆2', enabled}`, `fullTable`, `nothingAffordable`, `receipt: {line: 'LAST TURN · WIN 2 · +◆2', spread: 'WAR SPREAD TO MARRAM' \| null}`. |
| `endView(s)` | `null` until the game ends. `ending`, `stars` (3 / 2 / 1 / 0), `title` (`'WORLD UNITED · 30 of 30'`, `'CEASEFIRE · 26 of 30 gold'`, `'WAR'`), `lines` (`'Turn 15 · war peaked at 6'`; `'War held 4 regions when it stopped.'`; `'War took 10 regions. You held 18 of 30.'`, `'2 grey regions from the final push.'`), `turn`, `gold`, `red`, `grey`, `peakWar`, `best: {score, target, text: '749,414 · 39x the target'}`, `biggestTurn: {regions, text: '7 regions'}`, `staff` (seat order), `nearMiss` (WAR with 1-3 grey left: outline them gold; no grey line when none is left). |
| `menuView(s)` | `{ turn, nextShopAfter, line: 'Turn 9 · next shop after turn 10' }`. |
| `actsOn(s, staffId)` | Regions a staff acts on (long-press highlight): your gold (Governor, Surveyor), ports (Harbourmaster), capitals (Sovereign), every region (Herald). |
| `receipt(s)` | The shop receipt for the last send (also in `shopView`). |
| `previewNumber(s, slot, replaceSeat?)` | `{before, after, seat, replaces}`: the best send of the turn just played (its crisis and opening 10 lit, today's map) before and after hiring. Full table without `replaceSeat`: the best seat to replace. |

## State shape (`GameState`)

```
version: 2, seed, mode: 'game' | 'first' | 'crown'
rng: { war, crisis, deal, shop }              RngState each
phase: 'choose' | 'outcome' | 'shop' | 'over'
turn                                          from 1 (CROWN starts at 14)
owner: { [id]: 'grey' | 'gold' | 'red' }      all 30
coins, seats: [{ uid, id }] (left to right), oldHandM10 (10 = x1.0), nextUid
hiredSinceSend: uid[]                         the 'new' highlight on the next send
deal: { crisis, target (bigint), finalPush, lit (light-up order, crisis not listed), pile (swap order),
        opening (lit as dealt), pins (tap order), swapsLeft, swapLocked }
shop: { visit, offers: (StaffId | null)[3], rerollCost } | null      (non-null exactly in phase 'shop')
shopVisits
ending: 'WORLD UNITED' | 'CEASEFIRE' | 'WAR' | null                  (non-null exactly in phase 'over')
lastSend: SendRecord | null
log: [{ turn, target, score, regions, result: 'win' | 'miss', spread, gold, red }]
best: { score, target, turn, regions } | null   (the biggest win; the biggest miss while nothing has won)
peakWar, brass: id[] (regions won as a crisis)
```

`deal` stays after the send (phases `'outcome'`, `'shop'`, `'over'`) so the shop can rescore its opening deal.

## SendRecord (`state.lastSend`) and the trace

```
turn, crisis, target, finalPush, pins (west to east), onCrisis, points, m10, score
regions (won; 0 on a miss), result: 'win' | 'miss'
won:    [{ id, order (1 = crisis), wasRed, path (crisis ... id, the shortest chain of joins) }]
lost:   { id: crisis, from: war region the red ink runs from | null (bloom from centre) } | null
spread: { id, from } | null                   war spread by itself after this turn
coinsBefore, coinsAfter, goldBefore, redBefore, gold, red, grey
newHires: uid[]                               hired since the previous send: draw their first firing 1.5x
ending: Ending | null                         this send ended the game
trace: TraceEvent[]
```

`trace` is in animation order. Every event carries the running `points` and `m10` (BigInt) after it:

| kind | fields | when |
| --- | --- | --- |
| `pin` | `region`, `amount` (3-10), `label` `'+10'` | each pin, west to east |
| `staff` | `seat` (0-based), `staff` (the rule applied), `viaDeputy`, `op` `'+P' \| '+M' \| 'xM'`, `amount` (+P: points; +M: tenths; xM: factor in tenths), `label` `'+20'`, `'+4'`, `'×3'`, `'×1.4'` | Duty Officer, Quartermaster, Surveyor (fires `+0` below 3 gold), Old Hand, Strategist (only with 4+ pins) |
| `regionStaff` | as `staff` plus `region`; `op: 'xM'`, `amount` 15 or 20, `label` `'×1.5'` / `'×2'` | Governor (gold pins), Harbourmaster (ports), Sovereign (capitals): once per matching pin, west to east; with the Herald every pin matches the last two |
| `crisisX2` | `region`, `label: '×2'` | the crisis was pinned (always last before the slam) |
| `slam` | `score` | always last |

A Deputy fires as the staff to its right (`viaDeputy: true`, `seat` is the Deputy's seat); at the far right, or
copying the Herald, it fires nothing. The Herald never fires (it is passive). A send never moves seats, so
`state.seats[event.seat].uid` names the seat that fired (compare with `lastSend.newHires` for the 'new' highlight).

## The rules underneath

| Function | What it does |
| --- | --- |
| `target(t)` | T(t) = 64 x 1.5^(t-1), 2 significant figures, halves up (bigint): 64, 96, 140, 220 ... |
| `regionsWon(score, T)` / `nextMark(score, T)` / `marks(T, n)` | The ladder: marks T, 4T, 16T, then doubling (32T, 64T ...), no cap. |
| `scorePins(pins, seats, owner, crisis, oldHandM10, {trace})` | The exact BigInt scorer (`{score, points, m10, trace?}`). |
| `Scorer(seats, gold, oldHandM10).score(features)` | The fast scorer for enumerating (cached; agrees with `scorePins`). `featuresOf(pins, owner, crisis)`, `maskFeatures(mask, goldMask, crisisMask)`. |
| `effective(seats)` | What each seat fires as (Deputy resolved). |
| `touching`, `legal(pins, lit, crisis)`, `groups(lit, crisis)`, `groupMasks`, `canAdd(pins, r, lit, crisis)`, `lift(pins, r)`, `pinnable` | Legal groups and the tap and lift rules. |
| `winOrder(crisis, owner, k)` | The k regions a win takes: the crisis, then the nearest non-gold by joins (war before grey, then higher number, west, north). |
| `warSpreadTarget(owner)` | Where war spreads by itself: grey touching war, nearest your gold, then higher number, west, north; null if none. |
| `warSource(owner, id)` | The touching war region red ink runs from (nearest pin), or null. |
| `crisisPool(owner)` | `{pool, finalPush}`: grey touching gold; else any grey; else red touching gold (the final push). |
| `deal(owner, crisis, rng)`, `dealPool`, `scriptedDeal`, `swapLit` | The deal and the swap. |
| `distance(a, b)`, `pathBetween(a, b)`, `isJoined`, `isLane`, `ADJ`, `IDS`, `westToEast` | The join graph. |
| `countOwner`, `regionsOf`, `freshOwners`, `encodeOwners`, `decodeOwners` | Ownership helpers (the fixture string form). |
| `bestScore(lit, crisis, owner, seats, oldHandM10)`, `dealFeatures(lit, crisis, owner)` (the distinct feature sets of a deal's legal sends, for scoring many line-ups fast), `bestOnOpening(s, seats)`, `shopDue(t)`, `nextShopAfter(t)`, `drawOffers`, `price`, `sellValue` | Shop internals (and what a shopping bot needs). |
| `RULES` | Every tunable (`rules.ts`). |

## Saving, display, determinism

| Function | What it does |
| --- | --- |
| `saveGame(s)` / `loadGame(text)` | Versioned JSON (`{format: 'brink.war', version: 2, state}`), BigInts as decimal strings. `loadGame` returns `null` for anything unreadable or not a v2 game. The app stores it under `SAVE_KEY` (`'brink.war.v2.save'`). |
| `formatInt(n)` | `'10,920'` |
| `formatShort(n, maxGlyphs = 7)` | `'10,920'`, `'1.24M'`, `'1.23e25'`, `'GOOGOL'`; never more than `maxGlyphs` glyphs. |
| `formatM10(m10)` / `formatM10Short(m10, max = 5)` | `40n` -> `'4.0'`, `13814n` -> `'1,381.4'`; short: `'29.0M'`. |
| `formatFunds(n, {spaced})` | `'◆3'`, `'◆ 11'` |
| `hashState(s)`, `hashTrace(events)`, `canonical(x)` | 8-hex FNV-1a of a canonical encoding: the same seed and actions give the same hashes everywhere. |

## Test and bot helpers (`testkit.ts`)

`must(result)`, `pinAll(s, ids)`, `tapOrder(group)` (a touching group in an order that can be tapped),
`ownersFrom(gold, red)`, `position(s, {owner, seats, coins, turn, oldHandM10, deal})` (a hand-made position in
phase `'choose'`), `sendOptions(s)` (every legal send of the current deal with `score` and `regions`, best first;
ties by pins), `medianScore(options)`. `testdata.ts` (Node only, not exported from `index.ts`) has
`loadFixtures()` (`fixtures.json`, typed) and `toReference(trace)` (a trace in the reference's row form), for the
simulator's cross-check.

## Rulings where the spec is silent

- SWAP is refused (not used up) when nothing is unpinned or the pile is empty.
- Selling happens only in the shop; seats can be reordered during a turn and in the shop.
- `lost.from` / `spread.from`: the touching war region whose pin is nearest the target's pin (ties west to east).
- `won[].path`: a shortest chain of joins from the crisis; ties go to the neighbour first in id order.
- The CEASEFIRE and the final push never spread war (gold is gold for good and no grey is left).
- The engine does not reproduce Python's random numbers; FIRST-WORLD and CROWN are scripted, and the fixtures are
  fixed data.

## Tests

`npx vitest run src/war/engine src/war/content`. `docs/war/v2/reference/fixtures.json` (written by the reference's
own `fixtures.py`) holds 1,450 cases; the engine must agree with every one, traces included.
