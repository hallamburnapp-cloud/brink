# STORE.md — store copy, tags, art briefs, trailer, pricing

Everything a store page needs, in the game's register. One rule: nothing on a page
claims a thing the build cannot do. Brand constants: navy `#0b1220`, paper `#ece7d8`,
red `#e03b3b`; seat accents Republic `#4f8fc9`, Federation `#c43a3a`, Coalition `#c98a3a`.
Wordmark: bold serif, wide tracking. The mark: a paper ring with a red arc at one to
three o'clock. Tagline everywhere: *It's 3am. The phone is ringing. Every choice might
be the one that ends the world.*

Public URL is `VITE_PUBLIC_URL`; written below as `brink.example`. Replace before use.

---

## 1. itch.io page

**Title:** BRINK

**Tagline (itch "short description", shown in embeds and search):**
It's 3am. The phone is ringing. Every choice might be the one that ends the world.

**Hook**

Lead one of three great powers through five weeks on the edge of a war nobody wants,
one card at a time. Everyone at your door has advice, and everyone has an agenda.

**Body**

You are the President of the Republic, the Premier of the Federation or the Chairman
of the Coalition. At 02:14 a reconnaissance satellite over the Sorrel Straits stops
answering. At 03:12 a single track appears on the polar radar. A tanker has not
replied to a hail in six hours. Each card is a person with a problem and two ways to
make it worse. Drag left, drag right, or let the timer decide for you.

Five things you can see: public, military, allies, economy, escalation. Four you can
only hear about: how far the other side trusts you, how far the third power does,
how much your intelligence is worth, and how boxed in you are by what you have said on
camera. Nobody prints them. The Director says "moderate confidence" and you learn to
hear the difference between that and "we assess".

Each week ends in a flashpoint: The Intercept, The Line at Sea, Midnight, The Cascade,
The Summit. When you gamble, the odds are on the table before you choose and the margin
is on the table after. "They blink — 47%." "FAILED. Missed by 3%." You will remember
the number.

Between weeks, three people want a word. A Hawk General who hides the temperature from
your briefing slides. A doctrine of Launch on Warning. A Commercial Satellite Deal whose
shareholders are in every capital. Thirty-six posture pieces combine into builds the
briefing did not cover: Missile Defence and Deterrence by Denial make The Intercept
almost safe and make them trust you a little less every day. Find out what that does
at Midnight.

Forty-plus endings, each with the card where it went wrong, or held. A run is ten to
twenty-five minutes. Restart is instant. A seed replays identically, so when the world
ends you can find out exactly where. The share card is a picture of your five meters,
day by day, in five rows of coloured squares.

Every day there is one crisis, the same seed and seat for everyone, one attempt, and a
streak. The Daily is free, forever, at brink.example. This itch.io build is the whole
game, downloaded or played here, with the Daily included.

**Features**

- Three seats, three starting positions: the alliance-rich Republic, the sanctioned
  Federation with the big army, the Coalition everyone's infrastructure runs through.
- Two-choice cards, 23 speakers with their own voices, timers on the cards that deserve them.
- Five visible meters. Four hidden values carried by prose, never numbers.
- Five acts, five flashpoints with visible odds, near misses reported to the percent.
- 36 posture pieces (12 advisors, 12 doctrines, 12 assets) offered between acts; they combine.
- 40+ endings, a "moment it went wrong" card, a compendium, lifetime statistics.
- The Daily: one shared seed, one attempt, a streak. Endless: any seat, any seed, five DEFCON tiers.
- Shareable PNG with a five-row meter strip; seed replay; instant restart.
- No accounts, no chat, no comments, no leaderboards. Nothing leaves your device.
- Synthesised audio, no downloads; installs as an app and plays offline.
- Runs in a phone browser. 10–25 minutes a run.

**Content note**

Text depictions of geopolitical crisis, nuclear alerts and nuclear war; coups, civil
emergencies and the deaths of unnamed people at scale, described, never shown. No
images of violence: the game is text, silhouettes and meters. Occasional mild
language. Everything is fictional: no real state, leader, event or organisation is
depicted, and the content validator rejects real-world names.

**What's free and what's paid**

| | The Daily (free, forever, on the web) | Endless (this purchase, or the web unlock) |
| --- | --- | --- |
| Crisis | Today's, the same seed for everyone | Any seed; type one, replay one, share one |
| Seat | Today's, rotating Republic → Federation → Coalition | Any of the three |
| Attempts | One per UTC day | Unlimited; instant restart |
| Difficulty | DEFCON 5 | DEFCON 5 down to DEFCON 1 |
| Pieces, endings, compendium | Everything you meet counts | Everything |
| Streak and daily record | Yes | — |
| Share card | Yes | Yes |
| Accounts, cookies | None | None. A signed token on your device; restore by email |

This itch.io build ships with Endless open. It also plays today's Daily, the same seed
everyone else has.

*Build note (for us, not the page):* `npm run build:itch` currently sets
`VITE_ALL_UNLOCKED=1`, which also skips the unlock ladder (locked seats, DEFCON tiers,
earned pieces). Recommend the itch build use `VITE_PAYWALL=0 VITE_ALL_UNLOCKED=0`
so buyers keep the progression; the copy above assumes that.

---

## 2. Steam

**Short description (≤ 300 characters)**

Lead one of three great powers through five weeks on the edge of world war, one card at
a time. Five meters you can see, four you can only hear about. Advisors with agendas,
flashpoints with visible odds, forty-plus endings. Twenty-minute runs, instant restart,
a shared daily crisis.

**Long description** (enter as BBCode: `[h2]`, `[list]`, `[b]`)

[h2]About this game[/h2]

It's 3am. The phone is ringing. Every choice might be the one that ends the world.

BRINK is a run-based crisis-strategy game. You lead the Republic, the Federation or the
Coalition through five weeks on the slide towards a war that none of the three wants
and each is preparing for. A satellite goes dark over the Sorrel Straits. A track
appears on the polar radar and the second radar has not confirmed. Your Foreign Minister
has a number for everyone and has used most of them tonight. Each card is one of them,
with a problem and two ways to make it worse.

[b]Five meters, four hidden values.[/b] Public, military, allies, economy and
escalation are on the wall. Whether the other side believes you, how good your
intelligence is, and how boxed in you are by what you said on camera are not. They
are carried by the people in the room: "single source", "moderate confidence",
"they expect the worst". The odds at every flashpoint already include them.

[b]Odds you can see, misses you can measure.[/b] Every gamble shows its percentage
before you commit. Every roll shows its margin after. "Held by 2%" and "Missed by 3%"
are different sentences, and the game tells you which one you got.

[b]Posture is the build.[/b] Between weeks, three people want a word: an advisor, a
doctrine, an asset. Thirty-six pieces, each a small list of rules that stack in a fixed
order, so two pieces together are always the sum of their parts and often more than
you meant. Launch on Warning with a paranoid Director of Intelligence is a specific
kind of mistake. The game will let you make it.

[b]Forty-plus endings and the moment it went wrong.[/b] Nuclear midnight, a coup, a
constitutional crisis, a communiqué that holds. Every ending names the card that
decided it. Seeds replay identically. Restart is instant.

[b]One crisis a day.[/b] The Daily gives everyone the same seed and the same seat, one
attempt, and a streak. Endless gives you every seat, every seed and five DEFCON tiers.

[h2]Features[/h2]
[list]
[*] Three seats with different starting positions, allies and weaknesses
[*] Two-choice cards with drag or tap; timers on about one card in five
[*] 23 speakers, from the Duty Officer reading the board to your partner asking if you have eaten
[*] Five acts, five flashpoints, visible odds, near misses to the percent
[*] 36 posture pieces that combine into builds; a compendium that tracks what you have seen
[*] 40+ endings, each with the card where it went wrong or held
[*] A shareable card with your five meters, day by day
[*] Seed replay, instant restart, 10–25 minutes a run
[*] Daily mode with a streak; Endless mode with five DEFCON tiers
[*] No accounts, no online features, nothing collected
[*] All audio synthesised in real time; plays offline
[/list]

[h2]This is fiction[/h2]

The Republic, the Federation and the Coalition do not exist. No real state, leader,
event or organisation is depicted or implied. The dynamics — misperception, commitment
traps, the security dilemma, attribution — are real; the world is not.

*Steamworks fields to fill alongside:* mature content survey (text depictions of war and
nuclear war; no sexual content, no drug use, no graphic violence); system requirements
(any 64-bit OS from the last decade; WebView2 on Windows is bundled by the installer);
languages: English; support: `VITE_SUPPORT_EMAIL`.

---

## 3. Tags

### Steam user tags (up to 20, priority order)

Steam weights the first tags most for discovery. Put the honest genre first, the
highest-traffic adjacent tag where it will not mislead.

| # | Tag | Why here |
| --- | --- | --- |
| 1 | Strategy | The genre we belong to |
| 2 | Card Game | The interface; Reigns players search this |
| 3 | Political Sim | Small tag, exact audience |
| 4 | Roguelite | Runs, builds, permadeath, instant restart |
| 5 | Choices Matter | True in the literal sense |
| 6 | Multiple Endings | 40+ and shown on the page |
| 7 | Text-Based | It is; better to be found by people who want it |
| 8 | Interactive Fiction | Overlaps with 7; both have distinct browsers |
| 9 | Roguelike Deckbuilder | Highest-traffic adjacent tag. Not strictly a deckbuilder; pieces change the deck's weights rather than add cards. Keep, but never above 9: an arrival with Slay the Spire expectations should already have read the short description |
| 10 | Singleplayer | Descriptive; also signals "no online features" |
| 11 | Replay Value | Seeds, builds, three seats |
| 12 | Diplomacy | Back-channels, summits, the hotline |
| 13 | Cold War | Flavour tag people browse; we are not set in one, but the register is |
| 14 | Politics | Broader sibling of 3 |
| 15 | Wargame | Weak fit; retained because grand-strategy browsers filter by it |
| 16 | Difficult | Stand-down rate is single digits by design |
| 17 | Atmospheric | Navy, paper, the red wash, the drone |
| 18 | Minimalist | Type and meters, no illustration |
| 19 | Short | 10–25 minute runs |
| 20 | Indie | Solo developer |

Do not use: Grand Strategy (wrong expectations), Simulation (implies systems you can see),
Casual (the page would fight the tag), Post-apocalyptic (the game is about not getting there).

### itch.io

Genre: **Strategy**. Secondary classification: Card Game.
Tags (itch allows ten): `roguelite`, `card-game`, `strategy`, `political`, `text-based`,
`multiple-endings`, `singleplayer`, `daily`, `nuclear`, `minimalist`.
Made with: `TypeScript`, `Preact`, `Vite`, `Web Audio` (free-text field; Preact and Vite
are not in itch's picker).
Platforms: HTML5 (mobile friendly, fullscreen button, 430 × 860 embed). Release status:
Released. Accessibility tags: `Configurable controls` no; `Subtitles` not applicable;
tick `Textless` no; consider `High-contrast` (paper on navy) and `Colour-blind friendly`
only after checking the meter colours with a simulator.

---

## 4. Art briefs

### Main capsule (Steam header 920 × 430 and main 1232 × 706; itch cover 630 × 500 same composition)

**Concept.** A command centre at 3am, seen as a poster: the wordmark on navy under a
single lamp, and one red shape that says the world is nearly out of time.

**Composition.** Navy field with 1px scanlines at 4px pitch (as in `tools/og-image.ts`),
heavy vignette. Left two-thirds: the wordmark **BRINK** in bold serif, tracking +14,
paper colour, cap height ≈ 38% of the capsule height, baseline at 58%. A 3px red rule,
120px wide on the 920 capsule, under the first letter. Right third: the mark, large,
cropped by the top and right edges so only the paper ring's lower-left arc and the
whole red arc are in frame; the red arc glows (a soft red radial behind it at 20%
opacity, the same `--danger` wash the game uses). Nothing else.

**Type.** Serif bold only for the wordmark. If a tagline must appear (header capsule
only, never small), one mono line in `--color-mute`, 0.14em letter-spacing:
`IT'S 3AM. THE PHONE IS RINGING.` at 5% of the capsule height. No other words; Valve
rejects quotes, awards and marketing text on capsules.

**Colour.** Navy `#0b1220` (≥ 70% of the area), paper `#ece7d8` (the letters and ring),
red `#e03b3b` (the arc and rule only). No seat accents on the main capsule; the seat
colours belong to the Daily OG image, which changes daily.

**Legibility at 231 × 87 (small capsule, half size).** Five letters and one red arc.
Test: shrink to 231 × 87, blur by 1px; BRINK must still read as a word and the red arc
must still read as a shape, not a smear. The rule, scanlines and tagline may vanish. If
the letters need more room, drop the ring entirely and keep only the red arc, top right.

**Vertical capsule (748 × 896) and library capsule (600 × 900).** Wordmark in the top
60%, stacked large; the mark centred below; paper text on navy. Library hero
(3840 × 1240): scanlined navy, the red wash rising from bottom right, no type (the
library logo is composited over it). Library logo (1280 × 720, transparent): the
wordmark with the red rule, nothing else.

### Screenshots (six; 1920 × 1080 for Steam from the real desktop view, plus 1080 × 1920 portrait crops for itch and press)

Rules: real builds, no mock-ups, no marketing text overlaid (Steam). Captions are for
itch, the press kit and alt text. Escalation should be visibly different across the
set so the red wash tells its own story.

| # | On screen | Moment | Caption | Why it sells |
| --- | --- | --- | --- | --- |
| 1 | `falarm_01_one_track`: Lt. Cmdr. Rennick, one track out of the polar sector, the 10-second timer bar half gone, the card tilted right with the stamp WAIT FOR THE SECOND RADAR fading in; preview dots on military and intel; HUD reads DAILY #3 · THE REPUBLIC · WEEK ONE | Week One, day 2, escalation ~22 (cool navy) | "Ninety seconds before I have to wake the release authority. Sir or ma'am, that is you." | Anyone who has played Reigns understands the whole interface in one second. The timer and the copy carry the tone |
| 2 | The odds overlay at Midnight: label THEY BLINK, 47%, the needle mid-sweep in slow motion, red inset pulse on the frame; below it the resolved result FAILED · Missed by 3% | Endgame flashpoint, escalation ~78 (strong red wash) | "The odds are on the table before you choose. The margin is on the table after." | The signature mechanic and the sentence people will quote. Shows the flashpoint state visually |
| 3 | The offer screen "Adjust your posture": three piece cards, one per pool — General Oren Vasska (the Hawk General), Launch on Warning, Commercial Satellite Deal — with their mechanics lines visible; the Hawk selected, button reads BRING IN VASSKA | Between Week One and Week Two | "Between weeks, three people want a word." | Signals build structure to the roguelite audience; the mechanics text shows there are real rules |
| 4 | The HUD with a build in place: pieces row shows Hawk General + Defence Contractor; a card mid-drag with a "?" over escalation (hidden cost) and military +8 preview; the hidden-value line reads THEY EXPECT THE WORST · LOW CONFIDENCE · BOXED IN | Week Four, escalation ~66 | "Four values you never see as numbers. The General does not mention the fifth." | Depth without a tutorial: the "?" and the prose bands are the pitch for hidden information |
| 5 | The ending screen: ending name in large serif with its emoji, the red stamp NUCLEAR, THE MOMENT IT WENT WRONG with the card and its speaker, the 1080 × 1350 share card rendered below with the five-row strip turning red on the bottom row, buttons SHARE · RUN AGAIN · REPLAY THIS SEED | Any nuclear ending, day 27 | "Forty-plus endings, each with the card where it went wrong. Replay the seed and find out if it had to." | The share artefact and the promise of replayability in one frame |
| 6 | The home screen: DAILY #14 · 2026-10-11, THE COALITION in amber, "Same seed for everyone. One attempt. Streak 6.", the Endless card beneath, a compendium line reading 31% COMPLETE | Home, before play | "One crisis a day. Same seed for everyone. No account." | The habit and the frictionlessness; the Coalition accent shows the seat rotation |

Alternate for 6 if the page needs more drama: `falarm_26_the_call`, the Hotline speaker,
translated text with the pauses, caption "The pauses are the message."

---

## 5. Trailer — 30 seconds, 1920 × 1080 (portrait 1080 × 1920 cut from the same captures)

All sound is the game's own Web Audio synthesis, captured from the build; no music
bed, no foley. Cue names are the `Sfx` ids in `src/audio/sfx.ts`. Text overlays are
mono uppercase, paper colour, 0.2em tracking, lower third, one line each.

| # | Time | On screen | On-screen text | Audio |
| --- | --- | --- | --- | --- |
| 1 | 0:00–0:02 | Black. A mono timestamp fades in bottom left. | `03:12` | Silence, then `ring` begins (400 + 450 Hz double ring) |
| 2 | 0:02–0:04 | Home screen, dark; the Daily card; PLAY is pressed. | — | `ring` second ring, cut on the tap |
| 3 | 0:04–0:06 | `falarm_01_one_track` slides in, two ghost cards under it. Timer bar starts. | `EVERY CARD IS A PERSON WITH A PROBLEM` | `slide`; `heartbeat` starts slow |
| 4 | 0:06–0:08 | Drag right, stamp WAIT FOR THE SECOND RADAR, card flies out; meters ease with overshoot. | `AND TWO WAYS TO MAKE IT WORSE` | `heartbeat` faster, then `commit` thud; `meter_down`, `meter_up` |
| 5 | 0:08–0:10 | Three fast cuts, 0.6 s each: the Hawk General, the Dove FM, the Hotline. | — | `slide` × 3, tightening |
| 6 | 0:10–0:12 | Close on the hidden-value line: THEY EXPECT THE WORST · MODERATE CONFIDENCE · ON THE RECORD | `FOUR VALUES YOU NEVER SEE AS NUMBERS` | Room tone only (the scanline hum is visual; keep silence) |
| 7 | 0:12–0:14 | Offer screen; three pieces; the Hawk General is chosen. | `THIRTY-SIX WAYS TO ADJUST YOUR POSTURE` | `offer` (three bells F#5 A5 C#6), `act` motif |
| 8 | 0:14–0:16 | FLASHPOINT banner; 650 ms screen shake; red inset pulse begins. | `MIDNIGHT` | `flashpoint_hit` boom; `drone` fades in |
| 9 | 0:16–0:19 | Odds overlay: THEY BLINK · 47%. Needle sweeps in slow motion (2.4 s). | — | `roll` (bandpassed noise), `drone` under |
| 10 | 0:19–0:20 | FAILED, then: `· Missed by 3%` | — | `near_miss` (Asus4 creeping up, cut dead with a click) |
| 11 | 0:20–0:22 | Escalation meter climbs into the red; the page wash brightens; the card that follows enters. | `THE ODDS WERE ON THE TABLE. SO WAS THE MARGIN.` | `drone` intensity up, `meter_down` darker |
| 12 | 0:22–0:24 | Shake. Cut to black. Hold. | — | Silence (the 1.5 s the game itself leaves) |
| 13 | 0:24–0:26 | The ending screen fades in: the ending name, the red stamp, THE MOMENT IT WENT WRONG and the card. | — | `nuclear`: the single 55 Hz note, decaying |
| 14 | 0:26–0:28 | The share card, then the button REPLAY THIS SEED pressed; the first card of the same run slides in. | `A SEED REPLAYS IDENTICALLY` | Note tail; `slide` |
| 15 | 0:28–0:30 | Title card: the mark and wordmark on navy; the red rule; URL and platforms. | `BRINK` / `FREE DAILY · BRINK.EXAMPLE · STEAM · ITCH.IO` | `ring`, once, quiet, cut at 0:30 |

Notes. Every clip is the real app at 1920 × 1080 (the column centred on the textured
backdrop); the portrait cut is the same run recaptured at 1080 × 1920. Captions are
burnt in for platforms that autoplay muted; the audio is the argument for turning
sound on, so leave the first ring in even under a mute badge. Steam wants the trailer
first in the media strip and H.264 at the highest bitrate available.

---

## 6. Pricing

### Recommendation

| SKU | Price | Notes |
| --- | --- | --- |
| Web: Endless unlock (Stripe Payment Link, one-time) | **$5.99 · £4.99 · €5.99** | Set all three as explicit currency prices on the Stripe Price object (`currency_options`); let Stripe present other currencies by conversion. No regional discounting on the web: we do not know where anyone is (PRIVACY.md), the Checkout page does |
| itch.io (HTML build, everything included) | **$5.99, "or more"** | Same as the web unlock so neither undercuts the other. itch is merchant of record and handles VAT. Revenue share: keep itch's default or set 15% |
| Steam (Tauri desktop, Win/mac/Linux) | **$7.99 · £6.49 · €7.79** with a **10% launch discount** for the first week | Accept Valve's suggested regional prices (check current) for other currencies. The store page must be public before release for the period Valve requires (two weeks at last check — check current). A discount cannot follow a price change within Valve's cooling-off window (30 days at last check) so set the price before the Coming Soon page goes up and never touch it |

### Rationale

**Anchors, in qualitative terms.** Reigns is the interface's parent and sells for about
the price of a coffee on mobile and Steam (around $2.99 — check current); it set the
expectation that a two-choice card game is cheap. Balatro (Steam $14.99, mobile
$9.99 — check current) and Slay the Spire (Steam $24.99, mobile $9.99 — check current)
are the structure's parents and are priced as hundreds-of-hours games. Short-form
roguelites without a large studio sit in a $5–$15 band on Steam and are mostly free or
under $8 in the browser. A daily-seed game people are used to paying nothing for.

BRINK's interface says Reigns; its structure says Balatro; its length per run
(10–25 minutes) and content volume (about 300 cards, 36 pieces, 40+ endings at
launch) sit between them. The web unlock is bought on a phone, on the ending screen,
by someone who has just played one free run: it has to be an impulse. Under $6/£5 is
where that impulse lives. Above $4, Stripe's fixed per-transaction fee stops being a
large share of the sale (check the current fee schedule); below it, we would be paying
Stripe to sell the game.

Steam is higher for three reasons: Valve takes 30%; Steam players expect an installed
build with achievements and offline play and read a sub-$5 price as a warning; a
visible gap gives the web unlock a reason to exist without anyone saying "cheaper on
the web" on the Steam page (the web unlock is not a Steam key, so key-parity rules do
not apply; we still do not advertise the difference there). The launch discount is a
wishlist-conversion tool, not a price signal: 10% is enough to trigger the wishlist
email and small enough that full-price buyers on day eight are not annoyed.

**How the Daily and Endless relate.** The Daily is the demo that never expires and the
habit that brings people back; it is never gated and never nagged. The paywall appears
in exactly two places, both natural: "Run again (Endless)" and "Replay this seed" on
the ending screen after a Daily, and the Endless card on the home screen. Everything a
Daily player earns — seats, DEFCON tiers, pieces, the compendium — is kept and is
theirs the moment Endless is unlocked. Endless is a one-time price for the life of the
game; there is no subscription, no season, no currency. If we ever discount the web
unlock it will be for a Steam-parity reason, not before day 90.

**Tax (not advice; confirm with an accountant).** itch.io and Steam are merchants of
record and remit VAT. Stripe is not: web sales to EU consumers owe VAT from the first
sale under the non-Union OSS scheme, and UK sales are within UK VAT rules. Enable
Stripe Tax on the Payment Link and register before launch, or restrict the web unlock's
Checkout to the jurisdictions we are ready for and point everyone else at itch.io.

**What we will not do.** No "pay what you want" on the web (it converts worse at the
ending-screen moment and complicates tax). No price per seat or per DLC: the three
seats are the game. No launch sale on itch: itch buyers on day one are the people who
would have paid full price.
