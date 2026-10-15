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
| `choose(content, state, 'left' \| 'right'): Result` | Play today's card by a button. Resolves the day in full (see "A day") and deals the next card, opens the team offer or ends the game. |
| `tapRegion(content, state, regionId): Result` | The same on a map day: the tapped target acts on that region. |
| `pick(content, state, index \| null): Result` | At a team offer (`phase === 'offer'`): take `offer[index]`, or none with `null`. Deals the next day's card. |
| `preview(content, state, 'left' \| 'right' \| regionId): Preview \| null` | What that option will do, computed by the same code `choose` runs: DANGER before and after, every heat change, the odds, the pieces that fire, and the hint line. Null when the option does not exist today. |
| `danger(state): number` | DANGER as the gauge shows it: `min(100, 2 x TENSE + 5 x CRISIS + 12 x WAR + penalty)`. |
| `todayCard(content, state): Card \| null` | The card on the table (phase `choose`). |
| `todayOptions(content, state): ('left' \| 'right' \| regionId)[]` | `['left', 'right']`, or the target regions of a map card. |
| `saveGame(state): string` / `loadGame(content, text): GameState \| null` | Versioned JSON; `loadGame` returns null for anything it cannot trust. Store under `SAVE_KEY` (`brink.thirty.v1.save`) in try/catch (the app's job). |
| `weekOf(day)`, `isOfferDay(day)`, `dangerOf(heats, penalty)`, `mapDanger(heats)` | Small helpers. |
| `isSea(region)`, `isHome(region)`, `neighboursOf(region)`, `regionName(region)`, `HOME_REGIONS`, `HOME_CAPITAL`, `REGION_IDS` | The map as the rules see it. |
| `RULES`, `flareAt(day)`, `crisisPressureAt(day)`, `tensePressureAt(day)` | Every number, with the spec-fixed ones marked (`src/thirty/engine/rules.ts`), and the day's pressure odds. |

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
  deck: { used: CardId[]; queue: { card; from; to }[]; lastCardDay; hotSince; lastMapDay };
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
  arrival: TraceStep[];              // what happened as the card arrived (news, the Hotline, the Cautious mark): animate before the choice
}

type Ending =
  | { kind: 'WAR'; day; danger: 100; region }     // the region whose heating tipped DANGER to 100
  | { kind: 'STAND-DOWN'; day; danger: 0 }
  | { kind: 'HELD'; day: 30; danger; clean };     // clean when under 20
```

The UI draws: `DAY ${day} OF 30`; `danger(state)`; the map from `heats` (ring `card.region`; on a map day
glow `todayOptions`); the team row from `team`; the card from `content.cards[card.id]` with the two
`preview` hints. Marks (`redLine`, `warned`, `guarded`) are not drawn: the spec draws nothing else.

## A day

`choose` / `tapRegion` run the whole day and return the state at the start of the next one:

1. The option's effects, in the order the trace lists them: the tag's own effect on the acted region,
   the pieces that amplify it, the neighbour a show of force heats, the consequences the button named
   (`heats`, `crisis`, `relieve`, `mark`, `follow`), a policy's penalty.
2. Follow-ups queued (`follow` steps).
3. If the map now reads 0 (from day 5): STAND-DOWN, and the night is skipped. Otherwise pressure
   (`spread`, `pressure` and `flare` heat steps).
4. The ending check (WAR, HELD). Then, if the game goes on: the team offer after days 5, 10, 15, 20, 25
   (`phase: 'offer'`), otherwise `day + 1` and the next card dealt (`phase: 'choose'`).

`pick` records the choice and deals the next card. The deal itself changes the map: a card brings
news of trouble to its region, the Hotline calms a crisis card on arrival; those steps are in
`card.arrival`, and `danger(state)` already includes them. The gauge therefore moves twice a day: as
the card arrives (arrival) and as the choice lands (the trace).

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
  | { kind: 'roll'; odds; roll; held; text }        // text: 'Held' or 'Missed by 4%'
  | { kind: 'alarm'; false: boolean }              // a warning card resolved
  | { kind: 'penalty'; amount; piece; region; danger; text }   // +15 / +20
  | { kind: 'mark'; mark; region }
  | { kind: 'follow'; card; from; to }
  | { kind: 'danger'; at: 'start' | 'choice' | 'pressure'; danger };   // gauge checkpoints
```

`why`: `choice` is the button's own doing (the tag's effect, a named consequence, a missed roll's +1);
`news` the card's own arrival (only in `card.arrival`); `piece` names the piece; `spread` is a WAR
region spreading (`source`); `pressure` a CRISIS region's roll (`source`) or a TENSE region boiling
over (`source` is itself); `flare` trouble starting in a calm region. Every heat step carries the
DANGER after it, so the needle can follow.

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
changes the outcome, no penalty, and the tag's own effect happens as printed (a CALM or RISKY region
is above CALM; a FORCE card names the neighbour it heats). Otherwise the engine writes the line as
`<DANGER clause> · <world clause>`:

- DANGER clause: `Holds 65%` for a RISKY option that is neither certain nor doomed; else `Danger down`
  (`Danger down here` when a neighbour heats too), `Danger up`, or `Nothing changes` (`Danger
  unchanged` when the option still puts a mark on the region, so the line never claims nothing happens).
- World clause, comma-joined: `talks cannot fail` (Dove) / `a false alarm` / `the alarm is real`;
  `Shoal calms` (one region to CALM) or `Shoal cools` (one region, still above CALM) or
  `calms 4 regions`; `heats Lintel` or `heats 2 regions`; `DANGER +15`; the mark, last, so it is the
  first clause dropped: `Vessary guarded for a week`, `Orrinth is warned`, `the red line is Shoal`. With
  nothing to say: `a quiet day at home` (HOME), `Shoal is already calm`, `nothing changes abroad`.
- Fitted to 60 characters by dropping the last clauses.

Examples: `Danger down · calms 4 regions` (Old Ambassador + Back-Channel + Peace Movement),
`Danger down here · Shoal calms, heats Pebbleby` (a FORCE card with no `heats`), `Danger down · talks
cannot fail, Marram cools` (Dove), `Nothing changes · Saltwhite is already calm`, `Danger unchanged ·
Vessary guarded for a week` (the fleet guarding a calm home).

## Rulings (where the spec is silent, or where the simulator made us choose)

- **Sea regions**: the 18 ports (both ends of every sea lane) plus Lantern Key, the island without a
  lane: 19 regions. The Loyal Admiral's "force at sea" means the acted region is one of them, and
  "every neighbouring sea region" is its land and lane neighbours among them; they cool by two, as much
  as the force itself (`RULES.admiralCool`).
- **Home**: the Spin Doctor's "home never heats" protects all six Highmarch regions from every heat
  (pressure, flares, a show of force, a consequence, Peace Movement). Peace Movement's "force choices
  heat home" heats the capital, Edda Vale.
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
- **Hawk General** adds two steps as a second heat step on the acted region; the neighbour heat is
  unchanged (the cost stays).
- **Hotline**: once per five-day week (days 1–5 are week 1), when a card arrives about a region at
  CRISIS or WAR, that region cools two steps before the choice (`RULES.hotlineCool`: the crisis ends).
- **Dove Foreign Minister** makes a RISKY option certain when it is talks: a card of the Foreign
  Minister or the Old Ambassador (CONTENT.md's convention). "Fly the reconnaissance planes" stays a risk.
- **Pressure order**: WAR regions spread, then CRISIS regions roll, then TENSE regions may boil, then
  flares, all in map order from a snapshot of the heats as the day ended (a region heated tonight does
  not spread tonight). A WAR region heats only CALM or TENSE neighbours, as the spec says. A CRISIS
  region's roll heats a CALM or TENSE neighbour; it never pushes a CRISIS neighbour to WAR
  (`RULES.crisisPressureReachesCrisis` is off): under the shipped numbers, WAR comes only from choices
  (a show of force into a crisis, a missed risk on one, a named `heats`). Two WAR regions may heat the
  same neighbour twice.
- **The slide (beyond the spec's pressure; see "Tuning")**: every night, trouble flares in calm regions
  (`flareAt(day)`: 0.3 expected flares on day 1 rising to 4 on day 30 along `slide^1.25`), and a TENSE
  region may boil over to CRISIS on its own (`tensePressureAt(day)`: 0 on day 1 to 7% on day 30). The
  CRISIS roll stays the spec's one in three all month. Flares and boils respect guards and the Spin
  Doctor's home.
- **News (beyond the spec)**: a card finds its region in trouble. On arrival the card's region rises to
  TENSE, or to CRISIS for an arc's first card, if it was calmer (`RULES.newsHeatPlain`, `RULES.newsHeat`;
  in `card.arrival`, why `news`). Day 1's card is about the starting crisis, so the start still reads 11.
- **STAND-DOWN** is judged on the map after the choice, from day 5: a map read calm has nothing for
  the spec's pressure to work on, and a flare that night would contradict "the crisis is over". The
  night is skipped. A penalty (a crossed red line) keeps the gauge above 0 and so prevents it.
- **WAR** names the region whose heat step (or penalty) took DANGER from below 100 to 100. **HELD** is
  the end of day 30 below 100; `clean` under 20.
- **Penalties**: Red Lines' +15 and Launch on Warning's +20 are the spec's own additions to a DANGER
  otherwise read off the map. They are kept in `penalty`, added to the gauge, and never fall.
- **Red Lines** doubles every cooling step on the named region (a CALM there cools 2; with the Old
  Ambassador 4). The region is named by a card with `mark: red-line` (the pack's `redline-map`,
  `when: { pieces: [red-lines] }`); cards unlocked by a held piece are dealt as soon as they fit. A pack
  with no such card names the hottest region at the pick.
- **Marks**: `warned` is permanent; `guarded` turns pressure and flares (only those) away for seven
  nights (`RULES.guardDays`); `red-line` renames the red line.
- **Warnings (false alarms)**: a card with `alarm: true` (asked of the content schema; until then
  `KNOWN_ALARMS` names `alarm-02`) is a warning. Its RISKY "wait" holds exactly when the alarm is
  false, decided when the card is dealt from the printed odds (the odds are the chance it is false).
  **Cautious Intel Director**: the truth is shown on arrival (`card.alarm` is `'false'` or `'real'`; the
  preview's odds become 100 or 0 and the hint says `a false alarm` / `the alarm is real`). **Paranoid
  Intel Director**: warning cards and their follow-ups come a day earlier, and one in four warnings is
  false on top of the printed odds (the preview shows the combined chance). **Launch on Warning**: a
  false alarm on a region marked `warned` (the mark may be today's) is +20; war never spreads from a
  warned region.
- **HOME** sets `homeDay`; no domestic card is dealt the day after. The Spin Doctor stops them
  altogether (`fits` in deck.ts).
- **The deck**: follow-ups first (soonest deadline, then the hottest region); then cards unlocked by a
  held piece (`when.pieces`); then a card for a CRISIS or WAR region that has had none for two days (and
  on day 1, the starting crisis); then a map card with chance one in five (never on day 1, never two
  days running); then a weighted draw by the region's heat (CALM 1, TENSE 2, CRISIS 4, WAR 6). A
  follow-up ignores `when` (the arc is the story) and is dropped if it could only come after day 30. A
  RISKY button's `fail.follow` replaces `follow` on a miss. Each card comes once; when nothing unused
  fits, the deck reuses the single-day card dealt longest ago, then ignores `when`, then the day range.
  The deck never stalls.
- **The offer** draws three from the pieces not held and not excluded by a held piece (seeded, stream
  `offer`); fewer when fewer remain; none when the team is full (five).
- **Odds rolls** are made when the card is dealt (stream `odds`), one per card, so a save mid-day
  replays the same roll. `Missed by n%` is `ceil(roll x 100 - odds)`, at least 1.

## What the engine asks of the content

- `alarm: true` on warning cards (an optional boolean on any card; default false). Until the schema
  carries it, `KNOWN_ALARMS` in `cards.ts` names `alarm-02`.
- Every card's region is lit on arrival (news): a card set in a calm region makes it TENSE, an arc's
  first card makes it CRISIS. Messages that describe trouble already match; a "quiet day" card
  (`when.heat: [0, 1]`) will still find its region TENSE when it arrives.

## The simulator

`npx tsx tools/thirty-sim.ts [--games N] [--seed P] [--bots random,sensible] [--md] [--json PATH] [--strict]`
plays N games (default 2,000) per bot on the pack and prints the SPEC gates, the outcomes, the piece
take rates, the hold rate by team size and the mean DANGER curve. Bots (`src/thirty/sim/bots.ts`):
**random** (a random button or tap; at an offer a random piece or, one time in four, none);
**sensible** (the option whose preview leaves DANGER lowest once tonight's expected pressure on the
resulting map is counted, odds-weighted for a risk, ties towards cooling the hottest region; the piece
that shares a tag with one it holds, `any` for half a point; with nothing held, a seeded pick weighted
by how many pieces the candidate could later stack with). A vitest (`src/thirty/sim/sim.test.ts`)
plays 120 games per bot and checks the gates a small sample can judge.

### Results (2,000 games per bot, shipped numbers, pack of 127 cards)

| gate | seeds T0–T1999 | seeds U0–U1999 | target |
| --- | --- | --- | --- |
| G1 random holds to day 30 | 11.6% | 9.5% | under 10% |
| G2 sensible holds | 53.8% | 55.9% | 55–70% |
| G3 sensible stands down early | 20.5% | 20.3% | 15–30% |
| G4 least-taken piece (sensible) | spin-doctor 18.3% | 18.1% | at least 10% |
| G5 most-taken piece (sensible) | peace-movement 64.3% | 65.3% | at most 70% |
| G6 median sensible game | 30 days | 30 days | 20–30 days |
| G7 stalls | 0 | 0 | none |
| G8 sensible games with the gauge above 60 | 53.3% (median peak 65) | 55.1% (median peak 66) | at least half |

G3–G8 pass on both seed sets. G1 and G2 sit on their thresholds: across seed sets random holds
9.5–11.6% and sensible 53.8–55.9% (one standard deviation at 2,000 games is about 1.1 points), so they
pass on one set and fail on the other. Sensible war is 24–26%; random war 87–90%; the random bot's
mean gauge passes 60 on day 18 and the sensible bot's on day 25. Sensible games that reach the fifth
pick hold 78% of the time; no game that ended with fewer than five pieces held (those are the games
that ended early).

### Tuning log (what changed from the spec's numbers, and why)

1. **The spec's pressure alone does not slide.** With only the spec's rules (WAR spreads one
   neighbour, CRISIS one in three, three TENSE and one CRISIS to start), the random bot held 72% and the
   sensible bot stood down in 82% of games with a median peak of 11: nothing heats a calm map, and one
   cool per day beats one crisis's third of a step. Tuning the CRISIS odds alone (one half, two thirds,
   certain) moved random to 24% and still gave no tension (median peak 15).
2. **News** (a card lights its region on arrival) was added first for the fiction (a card about a
   blockade should find the strait in trouble) and because it costs a careless player more than a
   careful one; on its own it changed the gates little.
3. **Flares and the boil** are the slide. Flares (calm regions turning TENSE at night) keep the map
   alive; the boil (TENSE regions turning CRISIS at night) is what makes the midgame dangerous. Flat
   rates either let random hold (flares alone cap the gauge at 60) or killed everyone before the pieces
   arrived; a ramp (0.3 flares a night on day 1 to 4 on day 30, boil 0 to 7%) gives the hump the spec
   wants: the mean gauge climbs to about 60 by day 25 and the build holds it there.
4. **STAND-DOWN judged after the choice.** With flares, a map read 0 after pressure almost never
   happens (a flare lands most nights). Judging the calm map after the choice restored stand-downs
   from 2% to 20% without touching anything else, and it is what the spec means ("the crisis is over").
5. **CRISIS pressure kept off CRISIS neighbours.** Letting crises push each other to WAR made the
   midgame a lottery (war 50–85% at any flare rate that produced tension). With it off, WAR comes from
   choices, and the sensible bot's war rate settled at about 25%.
6. **Piece reach**: the Hotline ends the crisis (two steps), the Loyal Admiral's sea neighbours cool
   two, the Old Ambassador's step rides on every calming step. Each raised the sensible hold rate by
   one or two points and random by less than one; the Ambassador reading is also the one that makes
   the spec's "20 or 30 in one go" true.
7. **The two gates that remain on the line** (G1, G2) are coupled: every lever that drowns the random
   bot (more boil, more flares, crisis news on every card) also drowns the sensible one, and every
   lever that saves the sensible one saves random too, because the gap between them is set by things
   the spec fixes: the pieces' printed numbers, the one-card-a-day throughput and the share of HOME
   buttons in the pack (35 of 258). Widening the gap further would need either stronger stacking than
   the printed rules allow or a less forgiving random bot. Reported rather than forced.

8. **Integration check (6,000 games per bot, seeds V).** Before the release candidate the flare ramp
   was swept once more against G1 and G2: the shipped numbers read random 11.1%, sensible 55.0%; a
   straight ramp to 3.75 flares (`flareCurve` 1) read 9.0% / 53.8%; to 3.6, 9.5% / 54.1%; a 1.1 curve
   to 3.75, 10.0% / 54.9%. Every setting that pulls random under 10% pulls sensible under 55% with it
   (the gap stays 44–46 points), which confirms item 7 at a sample where one standard deviation is
   about 0.6 points. The shipped numbers stay; `npm run sim:thirty` (seeds T) reports G1 and G2 as
   failing by 1.6 and 1.2 points, seeds U pass both.

Rejected on the way: crisis-level news on every card (random fell to 5% but stand-downs to 4%); a
quieter middle of the month (`flareCurve` 2: stand-downs 28% but random 19% and the median peak 47);
heavier CRISIS odds (war without tension); a one-night pressure lookahead in the sensible bot (no
measurable change, kept because it is what a careful player does).
