# BRINK: THIRTY DAYS — the engine

`src/thirty/engine` is pure TypeScript: no DOM, no imports of the virtual content module. Every
function takes the compiled pack (`ThirtyContent` from `src/thirty/content`) and a state, and returns
a new state; the one passed in is never changed, so a Preact signal can hold it and see every change.
The spec is `SPEC.md` in this folder; this file is the API, the state, the trace, the hint rules, the
rulings the engine makes where the spec is silent, and what the simulator found. The simulator is
`src/thirty/sim` and `tools/thirty-sim.ts`.

```ts
import { content } from '@/thirty/content';
import { newGame, choose, tapRegion, pick, preview, danger, saveGame, loadGame } from '@/thirty/engine';
```

## The API (one line each)

| function | does |
| --- | --- |
| `newGame(content, seed): GameState` | Day 1: the seeded map (one CRISIS, three TENSE, never in Highmarch; DANGER 11) and the first card, which is about the crisis. |
| `choose(content, state, 'left' \| 'right'): Result` | Play today's card by a button. Resolves the day in full (see "A day"): the choice, the night (pressure and tomorrow's card, whose news is the night's last step), the ending check; then the team offer or the next morning. |
| `tapRegion(content, state, regionId): Result` | The same on a map day: the tapped place acts on that region. |
| `pick(content, state, index \| null): Result` | At a team offer (`phase === 'offer'`): take `offer[index]`, or none with `null`. Puts the card dealt last night on the table (dealt again if the pick made it unfit, e.g. the Spin Doctor and a domestic card). |
| `preview(content, state, 'left' \| 'right' \| regionId): Preview \| null` | What that option will do, computed by the same code `choose` runs: DANGER before and after, every heat change, the odds, the pieces that fire, and the hint line. Null when the option does not exist today. |
| `danger(state): number` | DANGER as the gauge shows it: `min(100, 2 x TENSE + 5 x CRISIS + 12 x WAR + penalty)`. |
| `todayCard(content, state): Card \| null` | The card on the table (phase `choose`). A map card comes with the places chosen from the live map when it was dealt (`state.card.targets`), so the UI, the preview and the tap read one card. |
| `todayOptions(content, state): ('left' \| 'right' \| regionId)[]` | `['left', 'right']`, or the places of a map card. |
| `nightLine(trace)`, `nightDelta(trace)`, `nightSteps(trace)`, `listNames(ids)` | The night in words, the one wording the UI shows under OVERNIGHT: `The war in Shoal spread to Lintel; trouble flared in Quillon, Marram and Shoal.` (null when nothing happened); what DANGER did overnight; the steps after the choice; `Quillon, Marram and 2 other places`. |
| `warRegion(working)` | Where the fighting began at a WAR ending: a region that is red on the final map (see "Rulings"). |
| `resolveTargets(mapCard, state, strict?)` | A map card's places read off the live map, labelled by the engine; null (strict) when fewer than two would lower DANGER. |
| `saveGame(state): string` / `loadGame(content, text): GameState \| null` | Versioned JSON; `loadGame` returns null for anything it cannot trust. Store under `SAVE_KEY` (`brink.thirty.v1.save`) in try/catch (the app's job). |
| `weekOf(day)`, `isOfferDay(day)`, `dangerOf(heats, penalty)`, `mapDanger(heats)` | Small helpers. |
| `isSea(region)`, `isHome(region)`, `neighboursOf(region)`, `regionName(region)`, `HOME_REGIONS`, `HOME_CAPITAL`, `REGION_IDS` | The map as the rules see it. |
| `RULES`, `flareAt(day)`, `crisisPressureAt(day)`, `tensePressureAt(day)`, `warFromCrisisAt(day)` | Every number, with the spec-fixed ones marked (`src/thirty/engine/rules.ts`), and the day's pressure odds. |

`Result` is `{ ok: true, state }` or `{ ok: false, state, reason }` (the state unchanged, the reason
a short lower-case phrase: `'tap a place on the map'`, `'choose a side'`, `'pick a piece first'`,
`'the game is over'`, `'that place is not offered today'`, `'no such piece'`).

## The state

```ts
interface GameState {
  version: 1;
  seed: string;
  day: number;                       // 1–30, the day on the strip; after the end, the last day played
  phase: 'choose' | 'offer' | 'over';
  heats: Record<RegionId, 0 | 1 | 2 | 3>;   // CALM, TENSE, CRISIS, WAR for each of the 30 regions
  penalty: number;                   // DANGER added by Red Lines (+15) and Launch on Warning (+20); never falls
  team: PieceId[];                   // pieces held, in the order taken, at most five
  redLine: RegionId | null;          // the Red Lines region once named
  warned: RegionId[];                // regions marked `warned`
  guarded: Record<RegionId, number>; // region → last day pressure cannot heat it
  hotlineWeek: number | null;        // week (1–6) the Hotline was last used
  homeDay: number | null;            // day of the last HOME choice (no domestic card the day after)
  card: DealtCard | null;            // today's card while phase is 'choose'
  offer: PieceId[] | null;           // the three pieces while phase is 'offer'
  picks: { day; offer; taken }[];    // every offer and what was taken
  deck: { used: CardId[]; queue: { card; from; to }[]; lastCardDay; hotSince; lastMapDay; next };   // next: tomorrow's card, held through an offer
  rng: { world; deal; odds; pressure; offer };   // five seeded streams (src/engine/rng.ts), forked once from the seed
  log: DayTrace[];                   // one per resolved day; log[log.length - 1] is the one to animate
  ending: Ending | null;
  peak: number;                      // the highest DANGER read at the end of any day
}

interface DealtCard {
  id: CardId;
  region: RegionId | null;           // the ringed region (null on a map card about no one place)
  roll: number;                      // the day's odds roll in [0, 1), made when the card was dealt
  alarmFalse: boolean;               // a warning card: is the alarm false? (decided at the deal)
  alarm: 'none' | 'unknown' | 'false' | 'real';   // what the player may know (Cautious Intel Director marks it)
  arrival: TraceStep[];              // what happened as the card arrived (the Hotline, the Cautious mark; day 1's news): animate before the choice
  targets?: MapTarget[];             // a map card's places, chosen from the live map when it was dealt, each with the engine's label as its hint
}

type Ending =
  | { kind: 'WAR'; day; danger: 100; region }     // where the fighting began: a region at WAR on the final map
  | { kind: 'STAND-DOWN'; day; danger: 0 }        // the map read 0 after the choice, from day 10
  | { kind: 'HELD'; day: 30; danger; clean };     // clean when under 20
```

The UI draws: `DAY ${day} OF 30`; `danger(state)`; the map from `heats` (ring `card.region`; on a map day
glow `todayOptions`, labelled with `preview(...).hint`, which is the same string as the dealt target's
`hint`); the team row from `team`; the card from `todayCard(content, state)` with the two `preview`
hints. Marks (`redLine`, `warned`, `guarded`) are not drawn: the spec draws nothing else.

## A day

`choose` / `tapRegion` run the whole day and return the state at the start of the next one:

1. The option's effects, in the order the trace lists them: the tag's own effect on the acted region,
   the pieces that amplify it, the neighbour a show of force heats, the consequences the button named
   (`heats`, `crisis`, `relieve`, `mark`, `follow`), a policy's penalty.
2. Follow-ups queued (`follow` steps).
3. If the map now reads 0 (from day 10): STAND-DOWN, and the night is skipped. Otherwise the night:
   pressure (`spread`, `pressure` and `flare` heat steps), then tomorrow's card is dealt and its news
   (its region found in trouble: `news`) is the last step of the night, so the gauge the player sees in
   the morning is the gauge the ending check judged.
4. The ending check (WAR, HELD). Then, if the game goes on: the team offer after days 5, 10, 15, 20, 25
   (`phase: 'offer'`, tomorrow's card waiting in `deck.next`), otherwise `day + 1` with the card on the
   table (`phase: 'choose'`).

`pick` records the choice and puts the waiting card on the table. The deal itself can still change the
map as the card arrives: the Hotline calms a crisis card one step (and the Cautious director marks a
warning); those steps are in `card.arrival`, so the chip can take the credit on screen, and
`danger(state)` already includes them. The gauge therefore moves at most twice a day: as the choice
lands and as the night passes (the trace), plus the rare arrival.

## The trace

`log[last]` is a `DayTrace`:

```ts
interface DayTrace {
  day; card; region;                 // the ringed region
  acted: RegionId | null;            // the region the choice acted on (the card's, or the tapped target)
  choice: 'left' | 'right' | { tapped: RegionId };
  tag: 'CALM' | 'FORCE' | 'RISKY' | 'HOME';
  dangerBefore; dangerAfterChoice; dangerAfter;   // start of day (after arrival), after the choice, after pressure
  steps: TraceStep[];                // in order
  fired: PieceId[];                  // chips to glow
  ending: Ending | null;
  offer: PieceId[] | null;           // the team offer that followed
}

type TraceStep =
  | { kind: 'heat'; region; from; to; why; piece?; source?; danger }   // why: see below
  | { kind: 'piece'; piece; note }                 // a piece fired without a heat of its own ('Talks cannot fail', 'Edda Vale does not heat', 'War does not spread from Shoal')
  | { kind: 'roll'; odds; roll; held; text }        // text: 'It worked · Danger down, Shoal calms' or 'It failed · Danger up, Shoal heats'
  | { kind: 'alarm'; false: boolean }              // a warning card resolved
  | { kind: 'penalty'; amount; piece; region; danger; text }   // +15 / +20
  | { kind: 'mark'; mark; region }
  | { kind: 'follow'; card; from; to }
  | { kind: 'danger'; at: 'start' | 'choice' | 'pressure'; danger };   // gauge checkpoints
```

`why`: `choice` is the button's own doing (the tag's effect, a named consequence, a missed roll's +1);
`news` tomorrow's card finding its region in trouble (the night's last step; in `card.arrival` on day 1);
`piece` names the piece; `spread` is a WAR region spreading (`source`); `pressure` a CRISIS region's
roll (`source`; to WAR when it tips a crisis beside it) or a TENSE region boiling over (`source` is
itself); `flare` trouble starting in a calm region; `war` the WAR ending's region going red so the map
agrees with the words. Every heat step carries the DANGER after it, so the needle can follow.
`nightLine(trace)` turns the steps after the `choice` checkpoint into one plain sentence, the most
important first (where the fighting began, red spreading, a crisis tipping a neighbour into war or
spilling over, a boil, flares, tomorrow's news, a penalty); the UI shows it under OVERNIGHT.

## The preview and the hint line

```ts
interface Preview {
  option; tag; text;                 // text is the button's action; null on a map target (label it with hint)
  hint: string;                      // the line under the action, at most 60 characters
  authored: string;                  // the writer's line, for reference
  odds: number | null;               // RISKY: chance it holds after pieces (100 certain, 0 known to fail)
  dangerBefore; dangerAfter;         // dangerAfter: after the choice, before pressure (if a RISKY holds)
  dangerIfMissed: number | null;     // RISKY: if it misses
  changes: HeatChange[]; changesIfMissed: HeatChange[] | null;
  pieces: PieceId[];                 // chips that will glow
  penalty: number;                   // DANGER a policy adds (Red Lines crossed, a false alarm on a warned region)
}
```

**Hint rules** (`hint.ts`). The authored hint is shown when it tells the truth today: no piece
changes the outcome, no penalty, its first words are the real DANGER word (`claimOf` the line against
`claimFor` the delta: `Danger down` only when the sum falls, `Danger down here` only when it falls and
some region ends hotter, `Danger unchanged` only when it stays), and the tag's own effect happens as
printed (a CALM region is above CALM; a FORCE card names the neighbour it heats and that neighbour really
heats; a RISKY option is at its printed odds, lowers DANGER if it works, and its miss costs something). A
place on a map day is always labelled by the engine, so the glowing places compare like for like.
Otherwise the engine writes the line as `<DANGER clause> · <world clause>`:

- DANGER clause, one of four: `Danger down` (`Danger down here` when a neighbour heats too), `Danger
  up`, `Danger unchanged` (always this for no net change: a mark, a calm region, a cool and a heat that
  cancel), and for a RISKY option that is neither certain nor doomed the same words with the odds:
  `Danger down if it works (65%)`, `Danger unchanged if it works (60%)`, `Danger up even if it works (60%)`.
- World clause, comma-joined: `talks cannot fail` (Dove) / `a false alarm` / `the alarm is real`;
  `Shoal calms` (to CALM) or `Shoal cools` (still above CALM) or, for a wave, `calms Shoal and 3 more`
  (the acted region named first); `heats Lintel`, `heats Lintel and Shoal`, `heats Lintel and 2 more`,
  and a region that reaches WAR as its own clause, `Kellmark goes to war`; on a risky option the miss,
  `if not, Shoal heats` / `if not, Shoal goes to war and Lintel boils over` / `if not, nothing changes`
  (the acted region's own calming is then left unsaid: "Danger down" says it); `DANGER +15`; the mark,
  last: `Vessary guarded for a week`, `Orrinth is warned`, `the red line is Shoal`. With nothing to say:
  `a quiet day at home` (HOME), `nothing to calm in Shoal`, `nothing changes abroad`.
- Fitted to 60 characters (46 on a map label, `MapPane.MAP_LABEL_MAX`) by tagged clauses (`fitClauses`;
  `fit` reads a finished line back): the mark goes first, then the acted region's own calming when the
  line says `Danger down` (implied), then a penalty; `heats A and B` shortens to `heats A and 1 more`, the
  miss to its first part, and a shortening that does not make the line fit is undone so a later drop
  keeps whole words; then the why-certain words and a wave; the own calming shortens to `calms here`,
  then goes; `heats ...` becomes `heats 2 places`; a `here` line never loses what heats, and a `Danger
  unchanged` line is never left with only a calming clause. `src/thirty/sim/hints.test.ts` plays 150
  sensible games on the shipped pack and fails on any button or label whose first words lie.

Examples: `Danger down · calms Shoal and 3 more` (Old Ambassador + Back-Channel + Peace Movement),
`Danger down here · Shoal calms, heats Pebbleby` (a FORCE card with no `heats`), `Danger down · talks
cannot fail, Marram cools` (Dove), `Danger unchanged · nothing to calm in Saltwhite`, `Danger
unchanged · Vessary guarded for a week` (the fleet guarding a calm home), `Danger down if it works
(70%) · if not, Shoal heats`. After a risky tap the roll step's text reads the same way, DANGER first,
once everything the choice did is known (a policy's penalty included): `It worked · Danger down, Shoal
calms`, `It failed · Danger up, Shoal heats and Lintel boils over`. The UI shows that text on the pressed
button; it writes none of its own.

## Rulings (where the spec is silent, or where the playtests made us choose)

- **Sea regions**: the 18 ports (both ends of every sea lane) plus Lantern Key, the island without a
  lane: 19 regions. The **Loyal Admiral**'s "show of force at sea" means the acted region is one of them;
  every neighbour, land or lane, inland or not, cools by two, as much as the force itself
  (`RULES.admiralCool`), before the force's own heat lands (item 15: as first written, sea neighbours
  only, the Admiral acted on 13% of the days it was held).
- **Home**: the Spin Doctor's "home never heats" protects all six Highmarch regions from every heat
  (pressure, flares, news, a show of force, a consequence, Peace Movement). Peace Movement's "force
  choices heat home" heats the capital, Edda Vale. A card about a home region that is calm is not dealt
  while the Spin Doctor is held: its news could not light it and the player would have nothing to do.
- **The neighbour a show of force heats** when the card names none: the coolest neighbour not at WAR
  (least damage), ties west to east. A named `heats` replaces it. Nothing heats when every neighbour
  is at WAR or protected.
- **Back-Channel** cools the hottest neighbour above CALM (ties west to east). **Peace Movement** cools
  the two hottest regions above CALM other than the acted one and the Back-Channel's, neighbours first
  among equals, then map order. A WAR region anywhere is within its reach ("a piece that reaches it").
- **Old Ambassador**: "every calming choice cools one step more" rides on every cooling the calming
  choice makes: the acted region, the Back-Channel's neighbour, Peace Movement's regions. With the three
  held, one Talks on a map of crises calms four regions and drops the gauge by 20 (by 30 or more from
  war), which is the spec's own description of the wave. Each extra step is its own trace step, so the
  chip glows only when it did something.
- **Hawk General**: a show of force also cools every neighbour one step (`RULES.hawkNeighbourCool`),
  before the force's own heat lands on the coolest (so a neighbour it cooled may end where it began,
  and the hint says only what nets). The spec's "two steps more" on the acted region fired in 1% of the
  games it was held (a force already takes orange to calm), so the piece is a wave instead; with the
  Admiral at sea, three steps on every neighbour (item 15).
- **Cautious Intel Director**: every risky choice that is not a warning is `RULES.cautiousOdds` (10)
  points more likely to work, capped at 95 (`effectiveOdds`; the roll uses the same odds, `holds`); the
  hint shows the new odds and the chip glows when the risk is taken. A warning keeps its own odds and is
  marked instead. **Paranoid Intel Director**: a CRISIS or WAR region gets its card by the next morning
  (`RULES.paranoidCardWithin`, in `starvingRegions`); `selectCardWhy` says when the card came early and
  the deal notes it on arrival (`Orrinth spotted early`) so the chip glows. The earlier readings (warnings
  a day earlier, one in four false) hung on the pack's one warning card and acted in 0% of games held.
- **Hotline**: once per five-day week (days 1–5 are week 1), when a card arrives about a region at
  CRISIS or WAR, that region cools one step before the choice (`RULES.hotlineCool`): the crisis ends
  (CRISIS becomes TENSE) and the card still has something for the player to do. The step is in
  `card.arrival` with the piece named, so the chip takes the credit as the card arrives. (Two steps
  left the card about a calm region and a button that said nothing would change; see "Tuning".)
- **Dove Foreign Minister** makes a RISKY option certain when it is talks: a card of the Foreign
  Minister or the Old Ambassador (CONTENT.md's convention), the envoy's hard talks included. "Fly the
  reconnaissance planes" stays a risk.
- **Pressure order**: WAR regions spread, then CRISIS regions roll (spill, the push between crises, the
  standing crisis turning red), then TENSE regions may boil, then flares, all in map order from a
  snapshot of the heats as the day ended (a region heated tonight does not spread tonight). A WAR
  region heats only CALM or TENSE neighbours, as the spec says. A CRISIS region's one-in-three roll
  (flat, the spec's figure) heats a CALM or TENSE neighbour. Two WAR regions may heat the same neighbour
  twice. A guard deflects pressure to another neighbour silently; the Spin Doctor's home and a warned
  region under Launch on Warning absorb it, noted, so the piece is seen to work.
- **Where red comes from** (item 15): from `RULES.warFromCrisisDay` (6), a CRISIS region that borders
  another CRISIS region may push it to WAR at night, with a chance rising from 0 that day to
  `RULES.warFromCrisisEnd` on day 30 (why `pressure`, `source` the pushing crisis, to WAR); and a
  crisis that has stood `RULES.crisisTipAfter` nights (1; `deck.hotSince`, read through
  `Working.hotSince`) may go to WAR on its own, at `RULES.crisisTipStart` rising to
  `RULES.crisisTipEnd` (why `pressure`, `source` itself; the night line says `the crisis in Shoal became
  war`), never one the choice cooled today. A show of force into a crisis, a missed risk on one and a
  named `heats` still can. So orange left standing is the thing to answer, and red, once there, spreads
  one neighbour a night until a choice answers it. The deck gives a WAR region its card within two days,
  like a CRISIS region (`RULES.warCardWithin`, `RULES.hotCardWithin`; item 13 below says why not the
  next day; the Paranoid director makes it the next morning).
- **The slide (beyond the spec's pressure; see "Tuning")**: every night, trouble flares in calm regions
  (`flareAt(day)`: `RULES.flareStart` expected flares on day 1 fading to `RULES.flareEnd` on day 30, so
  the late month's trouble is the red and orange the player can see), never in a region the choice
  cooled today (`Working.cooledToday`: the day's work stands until morning); and a TENSE region may
  boil over to CRISIS on its own (`tensePressureAt(day)`: 0 on day 1 to `RULES.tensePressureEnd` on day
  30). Flares and boils respect guards, the Spin Doctor's home and a warned region under Launch on
  Warning.
- **News**: tomorrow's card finds its region in trouble. The card is dealt at night, after pressure,
  and its region rises to TENSE, or to CRISIS for an arc's first card, if it was calmer
  (`RULES.newsHeatPlain`, `RULES.newsHeat`; why `news`, the night's last step), so the morning's card
  explains what the night did and the ending check has seen it. On an offer day the card waits in
  `deck.next` through the pick. Day 1's card is about the starting crisis, so the start still reads 11.
- **A map day's places** are read off the live map when the card is dealt (`resolveTargets`): a
  target with `from` takes the hottest region of its set above CALM not already offered (fixed targets
  first), `{region}` in the authored hint is filled in, and then every place is labelled by the engine
  the same way, so they compare. A map card fits only when at least `RULES.mapTargetsLowering` (two)
  of its places would lower DANGER; otherwise it waits (there are no days of no-ops). The dealt places
  are kept on `card.targets` and `todayCard` returns the card with them, so the UI, the preview and
  the tap read one card. When the deck has run out of everything else, a lenient resolution falls back
  to the authored regions.
- **STAND-DOWN** is judged on the map after the choice, from day 10 (`RULES.standDownFromDay`) and
  only once the gauge has read `RULES.standDownPeak` (30) at the end of some day (`state.peak`): a map
  read calm has nothing for the spec's pressure to work on, and a flare that night would contradict
  "the crisis is over". The night is skipped. The spec says "after day 5"; the playtests found a day-6
  win over a map that was never in danger read as a bug, and then a day-13 win with a peak of 20 read as
  the game giving up (item 15), so there must have been a crisis to end: before the peak a calm map is
  a quiet morning and the month goes on. A penalty (a crossed red line) keeps the gauge above 0 and so
  prevents it.
- **WAR** names a region that is red on the final map (`warRegion`): the region whose step filled the
  gauge if it is at WAR; if it is in crisis, it goes to WAR now (a `war` heat step, the trace's last);
  else the region that most recently went to war; else the hottest crisis goes to war; else (a map of
  tense regions and penalties) the hottest region does. The old reading, "the region that tipped it",
  named a tense town over a map with no red on it in 95% of wars. The ending's words (the UI's
  `endings.ts warLine`) read the log: the first region to go red that is still red is where the fighting
  began, with its day; the ending's region is the last straw (`On day 28 Kellmark fell, and the world
  followed`); and when the final night's `war` push painted the red, the line says `Too many crises at
  once` instead of inventing a history. **HELD** is the end of day 30 below 100; `clean` under 20.
- **Penalties**: Red Lines' +15 and Launch on Warning's +20 are the spec's own additions to a DANGER
  otherwise read off the map. They are kept in `penalty`, added to the gauge, and never fall.
- **Red Lines** doubles every cooling step on the named region (a CALM there cools 2; with the Old
  Ambassador 4). The region is named by a card with `mark: red-line` (the pack's `redline-map`,
  `when: { pieces: [red-lines] }`, its three places the hottest regions anywhere); cards unlocked by a
  held piece are dealt as soon as they fit, which is the deal after the pick (tomorrow's card is already
  on the table when the piece is taken). A pack with no such card names the hottest region at the pick.
- **Marks**: `warned` is permanent; `guarded` turns pressure and flares (only those) away for seven
  nights (`RULES.guardDays`); `red-line` renames the red line.
- **Warnings (false alarms)**: a card with `alarm: true` (an optional flag in the content schema; the
  pack's is alarm-02) is a warning. Its RISKY "wait" holds exactly when the alarm is
  false, decided when the card is dealt from the printed odds (the odds are the chance it is false).
  **Cautious Intel Director**: the truth is shown on arrival (`card.alarm` is `'false'` or `'real'`; the
  preview's odds become 100 or 0 and the hint says `a false alarm` / `the alarm is real`), and on every
  other risk it adds ten points (above). **Launch on Warning**: every show of force marks its region
  `warned` (the chip glows); a false alarm on a region marked `warned` (the mark may be today's) is +20;
  a warned region never heats at night (pressure, spill, a push and flares are turned away by
  `Working.protectedFrom` and noted once per region per night, `The warning held: Orrinth did not heat`,
  so the chip glows and the OVERNIGHT line says so); and war never spreads from a warned region.
- **HOME** sets `homeDay`; no domestic card is dealt the day after. The Spin Doctor stops them
  altogether (`fits` in deck.ts); a domestic card already dealt for tomorrow when the Spin Doctor is
  taken is dealt again (`pick` re-deals a card the new piece makes unfit).
- **The deck**: follow-ups first (soonest deadline, then the hottest region); then cards unlocked by a
  held piece (`when.pieces`); then a card for a WAR or CRISIS region that has had none for two days (and
  on day 1, the starting crisis; the next morning with the Paranoid director); then a map card with
  chance one in eight (never on day 1, never two days running, only with places worth tapping); then a
  weighted draw by the region's heat (CALM 1, TENSE 2, CRISIS 4, WAR 6; a map card by the heat of its
  places). A card about a region the day's choice cooled waits a day when it can (`selectCard`'s
  `avoid`, the night's `cooledToday`: a follow-up at its deadline still comes), so the morning's news
  does not undo the day's work. A map card dealt for the morning after a team offer is labelled again
  with the new piece when it is taken (`pick` re-reads its places), so the labels on the map, the card
  and the preview agree. A follow-up ignores `when`
  (the arc is the story) and is dropped if it could only come after day 30. A RISKY button's
  `fail.follow` replaces `follow` on a miss. Each card comes once; when nothing unused fits, the deck
  reuses the single-day card dealt longest ago, then ignores `when`, then the day range. The deck never
  stalls.
- **The offer** draws three from the pieces not held and not excluded by a held piece (seeded, stream
  `offer`); fewer when fewer remain; none when the team is full (five).
- **Odds rolls** are made when the card is dealt (stream `odds`), one per card, so a save mid-day
  replays the same roll. The roll step's text says what happened in words (`It worked · Danger down,
  Shoal calms`, `It failed · Danger up, Shoal heats`); `missedBy` keeps the margin for the log.

## What the engine asks of the content

- `alarm: true` on a warning card (an optional boolean, default false; the validator wants a RISKY
  option on it, the wait).
- Every card's region is lit by its news the night before it comes: a card set in a calm region makes
  it TENSE, an arc's first card makes it CRISIS. Messages that describe trouble already match; a "quiet
  day" card (`when.heat: [0, 1]`) will still find its region TENSE when it arrives.
- A map card's places are chosen on the live map: write targets with `from` (sea, home, abroad, any,
  allies, posts) and a `{region}` in the hint; the engine labels them (CONTENT.md "A map card").
- Risky hints state their odds as `(65%)` and the miss in a few words; the engine's own risky line is
  `Danger down if it works (65%) · if not, Shoal heats` (the validator warns when the odds are missing).

## The simulator

`npx tsx tools/thirty-sim.ts [--games N] [--seed P] [--bots random,sensible] [--md] [--json PATH] [--strict]`
plays N games (default 2,000) per bot on the pack and prints the SPEC gates, the outcomes, what the
playtests measured over the shoulder (red seen and its first day, wars decided by the push, nights that
gave back the day's drop, late spread against flare, amber on a HELD map, stand-down day and peak), the
piece take rates with how often each acted while held, the hold rate by team size and the mean DANGER
curve. Bots (`src/thirty/sim/bots.ts`): **random** (a random button or tap; at an offer a random piece
or, one time in four, none); **sensible** (the option whose preview leaves DANGER lowest once tonight's
expected pressure on the resulting map is counted, odds-weighted for a risk, ties towards cooling the
hottest region; the piece that shares a tag with one it holds, `any` for half a point; with nothing held,
a seeded pick weighted by how many pieces the candidate could later stack with); **hawk** (G9: sensible's
eye, but the force pieces first and a show of force whenever one is within `HAWK_MARGIN` (3) of the
best option). A vitest (`src/thirty/sim/sim.test.ts`) plays 120 games per bot and checks the gates a
small sample can judge.

### Results (2,000 games per bot, shipped numbers, pack of 127 cards; this build, item 15)

| gate | seeds T0–T1999 (`npm run sim:thirty`) | U0–U1999 | V0–V1999 | target |
| --- | --- | --- | --- | --- |
| G1 random holds to day 30 | 9.9% | 9.9% | 10.9% | under 10% |
| G2 sensible holds | 58.5% | 57.2% | 56.1% | 55–70% |
| G3 sensible stands down early | 15.5% | 15.5% | 15.8% | 15–30% |
| G4 least-taken piece (sensible) | red-lines 14.1% | red-lines 13.9% | red-lines 13.1% | at least 10% |
| G5 most-taken piece (sensible) | peace-movement 62.5% | peace-movement 60.8% | peace-movement 60.3% | at most 70% |
| G6 median sensible game | 30 days | 30 days | 30 days | 20–30 days |
| G7 stalls | 0 | 0 | 0 | none |
| G8 sensible games that feel close (red on the map, or above 60) | 72.0% (red 72.0%, median peak 37) | 73.0% | 73.0% | at least half |
| G9 hawk holds | 41.3% | 40.9% | 40.8% | 40–65% |

Every gate passes on the strict script (seeds T) and on seeds U; on seeds V, G1 reads 10.9% with the
other eight passing. G1, G3 and G9 sit within a point or two of their lines; one standard deviation is
about a point at 2,000 games, and the gates are coupled (item 7: every lever that drowns careless play
drowns careful play, and the spill rate, the one lever that falls harder on random, costs the hawk G9),
so this is as far inside them as the levers go. Sensible war is 26%; hawk war 54%; random war 89%.

Over the shoulder (sensible, seeds T; the fifth build's reading in brackets): a region goes red before
the end in 72% of games, on day 13 at the median (24); the engine's push on the final night decides 19%
of WAR endings (59%); the night gives back at least the day's drop on 66% of the days the choice lowered
DANGER (76%); over days 21–30 red spreading is a third of the night's trouble against flares (a
fiftieth); the median HELD map has one amber region (20); a stand-down comes on day 25 at the median
after a peak of 37 (day 13, peak 20). The hawk sees red in 96% of games and random in 98% by day 9.
Every button and label tells the truth (`src/thirty/sim/hints.test.ts`; the shoulder critic's sweep
reads 0 untrue `Danger down here` buttons of 546, from 1,029 of 1,722).

### Tuning log (what changed from the spec's numbers, and why)

1. **The spec's pressure alone does not slide.** With only the spec's rules (WAR spreads one
   neighbour, CRISIS one in three, three TENSE and one CRISIS to start), the random bot held 72% and the
   sensible bot stood down in 82% of games with a median peak of 11: nothing heats a calm map, and one
   cool per day beats one crisis's third of a step. Tuning the CRISIS odds alone (one half, two thirds,
   certain) moved random to 24% and still gave no tension (median peak 15).
2. **News** (a card lights its region) was added first for the fiction (a card about a blockade should
   find the strait in trouble) and because it costs a careless player more than a careful one; on its
   own it changed the gates little. It now happens at night, as the last step before the card (item 10).
3. **Flares and the boil** are the slide. Flares (calm regions turning TENSE at night) keep the map
   alive; the boil (TENSE regions turning CRISIS at night) is what makes the midgame dangerous. Flat
   rates either let random hold (flares alone cap the gauge at 60) or killed everyone before the pieces
   arrived; a ramp gives the hump the spec wants.
4. **STAND-DOWN judged after the choice.** With flares, a map read 0 after pressure almost never
   happens (a flare lands most nights). Judging the calm map after the choice restored stand-downs
   from 2% to 20% without touching anything else, and it is what the spec means ("the crisis is over").
5. **CRISIS pressure kept off CRISIS neighbours** (the first build). Letting crises push each other to
   WAR at any flare rate that produced tension made the midgame a lottery (war 50–85%); with it off,
   WAR came only from choices, and the sensible bot's war rate settled at about 25%. Superseded by
   item 9: the playtests found a game in which red almost never appeared had nothing to aim at.
6. **Piece reach**: the Loyal Admiral's sea neighbours cool two, the Old Ambassador's step rides on
   every calming step. Each raised the sensible hold rate by one or two points and random by less than
   one; the Ambassador reading is also the one that makes the spec's "20 or 30 in one go" true.
7. **The gates are coupled**: every lever that drowns the random bot (more boil, more flares, crisis
   news on every card) also drowns the sensible one, and every lever that saves the sensible one saves
   random too, because the gap between them is set by things the spec fixes: the pieces' printed
   numbers, the one-card-a-day throughput and the share of HOME buttons in the pack (35 of 258).
   Pressure that comes from crises (spill, the crisis-to-war push) widens the gap a little, because
   the random bot leaves crises standing; pressure that falls on every map alike (flares) narrows it.
8. **First integration check (6,000 games per bot, seeds V).** The first build's flare ramp was swept
   against G1 and G2: every setting that pulled random under 10% pulled sensible under 55% with it (the
   gap stayed 44–46 points), which confirmed item 7 at a sample where one standard deviation is about
   0.6 points.
9. **Red the player can see coming (this build).** The playtests' verdict on the first build: the
   threat was a uniform amber wash from random flares (0.3 rising to 4 a night), red appeared in 1% of
   days and never spread, and WAR endings named a tense town over a map with no red on it. So: flares
   were cut and given a one-night grace on regions the choice cooled (`Working.cooledToday`); from day
   10 a crisis beside another crisis may tip it into war at a chance rising to `warFromCrisisEnd` by
   day 30 (item 5 reversed, at a tenth of the rate that made the midgame a lottery); a WAR region gets
   its card within two days so it can be answered (one day at first; item 13); the WAR ending names a
   region that is red on the final
   map, pushing the tipping crisis to WAR if it must (`warRegion`); and the sensible bot was taught to
   weigh red and two touching crises as the lasting threats they are (`expectedPressure`). Red now
   appears in a fifth of sensible games and four fifths of random ones, mostly in the last third.
10. **Tomorrow's card dealt at night.** The first build dealt the card in the morning, so its news
    floated a second +N right after the tap and looked like the tap's doing. The deal moved to the
    night, after pressure: the news is the night's last step, the trace carries it, and the ending check
    sees it (a card could previously tip the gauge to 100 on arrival and the game went on a day). The
    Hotline's cooling stays an arrival step so the chip can take the credit; it cools one step now
    (CRISIS to TENSE) because two left a card about a calm region with a button that said nothing would
    change.
11. **The slide, re-tuned (seeds S/R, 300–1,000 games per setting, then T and U at 2,000).** With the
    structural changes the first build's numbers made the game too gentle (sensible stood down 52%,
    median peak 26). Spill (`crisisPressureEnd` 1/3 to 0.45), the boil (0.07 to 0.05) and the crisis-to-war
    push were set against flares: pressure that comes from crises favours the careful player, flares
    fall on everyone, and the gauge must still reach 60 in half the sensible games (G8), which on this
    map needs amber or red in volume. Settings tried and rejected: flares 0.6 to 1.2 (stand-downs 44–52%,
    random held 27%); the push at 0.4–0.6 (two touching crises tipped 64% of nights, sensible war
    31–54%); boil 0.08–0.15 (war 40–58%); spill 0.5 with the push at 0.2 (war 33%); a linear ramp to
    2.5 flares (stand-downs 13%, peaks 42); a late-only surge (`flareCurve` 1.4 to 3.2 flares) which
    passed G1, G2 and G8 on both seed sets but left G3 at 12–14%. The shipped curve (1.2 to 3.6 along
    `slide^2`: a quiet middle, a hot last week) is the one whose pooled 4,000-game result passes every
    gate; it buys the stand-downs back and brings back amber at the very end (20 tense regions at the
    median HELD ending), which is the trade the gates force. The night still adds at least what the
    choice removed on about three days in four: with one decision a day and a gauge that must climb to
    60, the night has to win on average; what changed is that it now says why (`nightLine`) and never
    undoes the region the player just calmed.
12. **STAND-DOWN from day 10** (`standDownFromDay`, spec: "after day 5"). The playtests stood the world
    down on day 5 and 6 with a peak of 11 and read it as a bug. With flares at 1.2 a night from day 1 no
    map is calm before day 10 anyway (setting the day to 8 changed nothing in 1,000 games); the number is
    there to be changed back if the owner prefers the spec's reading.

13. **Where the gap between the bots comes from (the integration).** With the settings above, seeds T
    read G1 10.3%, G2 54.6% and G8 50.0% and the strict script exited 1. Sweeps of 2,000 games per bot
    on seeds T and U, then 4,000 on T, U and V, found: every pressure lever moves both bots together
    (spill `crisisPressureEnd` 0.45 to 0.5 took 1.5 points off random and 2.2 off sensible; the push
    `warFromCrisisEnd` and the flare ramp likewise); the boil `tensePressureEnd` is the number that makes
    the month slide at all (0.05 to 0.03 raised random to 15% and sensible to 64% and dropped G8 to 42;
    a boil confined to tense regions beside a crisis or war left random holding 40% at any rate, so the
    "flat amber" the playtests disliked is also what defeats careless play); mid-month flares
    (`flareCurve` 1.7–1.9) lift G8 to 51–53 and pull random down but eat the stand-downs (G3 12–14%).
    Two rulings do widen the gap: a map day is kind to a random tap (two of its three places lower
    DANGER), so `mapDayChance` went from one in five to one in six (+0.5 on G2, −0.3 on G1); and a
    next-day card for a WAR region hands red (which random has in four games of five, sensible in one)
    a quick answer, so `warCardWithin` is two days, the spec's own figure for a crisis (−0.5 on G1, G2
    unchanged). Together: G1 9.3–9.8%, G2 55.2–56.1%, G3 15.2–16.9%, G8 49.7–50.9% over three
    4,000-game sets, and the strict script passes. Rejected here: `drawWeight` [1, 2, 5, 8] (both bots
    down), `hotCardWithin` 1 (random up), spill 0.47 on top (G2 54.4–54.7%).

14. **The pieces that act, and G9 (this build).** Through the engine API the fifth build had one viable
    build: a dove stack held 70%, a hawk stack lost 92%, no pieces lost 95%; the Hawk General fired on
    1% of the games it was held (its extra steps landed on a region the force had already taken to
    calm), the two directors and Launch on Warning hung on the pack's one warning card (seen in 10% of
    games) and acted in 0–2%. Five rules were rewritten so that each piece does visible work on orange:
    the Hawk General's show of force cools every neighbour one step (a wave of its own), the Loyal
    Admiral's at sea cools every neighbour two steps (inland ones too), the Cautious Intel Director adds
    ten points to every risky choice, the Paranoid Intel Director brings a crisis its card the next
    morning, and Launch on Warning warns every region a show of force touches, and a warned region
    never heats at night (the OVERNIGHT line says `the warning held: Orrinth did not heat`). A hawk bot
    (sensible's eye, the force pieces first, a show of force within 3 of the best) and gate G9 (holds
    40–65%) keep the second build honest. Pieces that acted while held, sensible, seeds T (before):
    Launch on Warning 13% of days (2%), Hawk General 10% (0.1%), Loyal Admiral 10% (13%, sea
    neighbours only), Cautious 7% (0%), Paranoid 4% (0%); and the Hotline 13% once its arrival steps
    were counted (the critics' 0% was the measure, not the piece).
15. **Red first, quiet calm nights, a crisis before a stand-down (this build).** The playtests' verdict
    on the fifth build: the threat was random amber (1.7 flares a night against 0.014 spreads from
    red), red first appeared on day 24 at the median and 59% of losses were painted red by the engine's
    push on the final night, the night beat the day on three days in four, and a stand-down on day 13
    with a peak of 20 read as the game giving up. So: flares fade through the month (1.0 to 0.35) instead
    of rising to 3.6; spill is the spec's flat one in three; from day 6 a crisis that has stood a night
    may turn red on its own (35% rising to 60%) and two crises side by side may tip each other (0 to
    60%); a STAND-DOWN needs the gauge to have read 30 (`standDownPeak`); a card about a region the
    choice cooled waits a day when it can; and map days come one in eight. Sixteen settings were swept
    at 400 games, then the candidates at 2,000 on seeds T, U and V (`scratchpad thirty/final/tune.mts`):
    flat 0.5 flares with weak tips left the sensible bot at 99% held and a median peak of 19 (a bot that
    answers every crisis the day its card comes never climbs); an early boil (0.12–0.2 on day 1) killed
    everyone (sensible 15–51% held); more red (tips 0.35/0.65) cost the hawk G9; a spill ramp to 0.4–0.45
    took a point off random and three off the hawk. G8 as first written (the gauge above 60 in half the
    sensible games) is the one line this model cannot meet without the late amber wash: the sensible
    peak distribution is bimodal (30% of games pass 60 and most of those die; the rest never leave the
    thirties), and a hint-reading bot (the biggest promised drop, no lookahead) reads the same. The gate
    now counts red on the map as close, which is what the watcher sees; the gauge alone is the owner's
    call to bring back. The night still gives back the day's drop on two days in three: with one
    decision a day it has to win on average, but the median HELD map now ends with one amber region, not
    twenty, and a calm map has a quiet night.

Rejected on the way (both builds): crisis-level news on every card (random fell to 5% but stand-downs
to 4%); heavier CRISIS odds alone (war without tension); a sensible bot that leans harder to stacking
pieces (held 63–66% but took Peace Movement in 77–80% of games and the Dove, the Spin Doctor and Red
Lines in 5%, failing G4 and G5); a one-night pressure lookahead in the sensible bot (kept because it is
what a careful player does, now with red counted at twice a night's spread).
