# HOTEL.md — BRINK, the night desk at The Brink Hotel

*It's 3am at The Brink. The phone is ringing.*

This is the third design and the one the game is built to from now on. It replaces
REDESIGN.md (the night) the way REDESIGN.md replaced the brinkmanship core; both are kept
as history (the crisis night is tagged `v0.3.0-night` and its content pack lives in
`content-crisis/`). The reasoning is in DECISIONS.md D-089 onward and in the step-back
panel's record (`docs/step-back/`): four critiques of the shipped night, six concepts, three
judges. Every judge put a hotel first.

## The pitch, in one breath

You are the night manager of The Brink, a grand old seaside hotel on a cliff that is
slightly too big for its staff. It is 3am, the phone is ringing, and you have until the
Day Manager walks in at 6:00 to keep the guests happy, the staff sane, the money in the
till and the building standing. At six, a guest writes your review out of five stars.
That review is what you post. Everyone in the world gets the same night.

## Why a hotel

The crisis night kept every mechanic the critiques said to keep and failed on the three
they called fatal: the theme capped the audience (nobody posts ☢️ to their mum), one
attempt a day made a stranger's only game the tutorial, and the climax was dice. A hotel
at 3am keeps the whole shape (the phone, the clock as the only number, two-sentence
cards, a cast with agendas, the Partner with soup) and removes all three: nobody dies,
the worst night is a one-star review, practice is free and instant, and no roll can end a
night. The cast transliterates one for one, so the voice survives: the General is the
Chef, the Spy Chief is the Concierge, the Hotline is The Majestic across the square, the
Press is the Critic in 212, the Opposition is the Day Manager. The name becomes the joke.

## The one rule

**Keep the four bars off the floor until 6:00.** GUESTS, STAFF, MONEY, THE BUILDING. A bar
that empties ends the night (a walkout, the staff walk, the Owner closes you, the fire
brigade closes you). A full bar is good, and a very full bar brings a comedy card (a coach
party books in; the Owner wants a fountain). That is the entire rulebook and the only thing
the game explains, once, on the first night.

## The night

- Exactly **18 cards**, 3:00 to 6:00, **ten minutes of the clock each** (a card may say
  `minutes: 5` or `20` for rhythm; the Booking's head cards may run long). The clock never
  pins and never lies: card 18 ends at 6:00.
- One **Booking** per night (THE SWAN, THE WEDDING, THE ALARM…): its opener is card 1, three
  beats land in slots 4–6, 9–11 and 13–14, the head in 15–17, and it resolves into the
  review. The rest of the deck is the pool: the regulars, the Owner, The Majestic, Your
  Partner (always in the four o'clock hour, slots 7–12), callbacks and full-bar comedy cards.
- **Odds are words**, never numbers: Likely (≥ 0.7), Even (≥ 0.5), Risky. They are driven
  by regard, the hidden values re-read as people: the Owner's patience, the Critic's
  opinion, tonight's lead guest's goodwill, and your own promises. A roll costs or saves a
  bar and says so in a sentence; **no roll may carry an ending**.
- **Every choice has a reply**: the world answers in one line before the next card. Odds
  cards answer with their outcome sentence. This is where the comedy lives.
- **Practice first.** A brand-new player's first tap is a practice night (THE SWAN, cost
  scale 0.85, no timers). Tonight, the shared night, comes after; it is one recorded
  attempt that is safe to put down (Home keeps it where it is) and never a forfeit.
  Yesterday's night is free to replay. Again restarts the same seed instantly.
- **Memory.** Up to eight `memory:` flags survive the night and are seeded into the next,
  so Room 12 opens tomorrow with "You gave my sea view to a dog last night."

## The cast (14, roles on cards, names in the Guest Book)

| id | Role on cards | Was | Portrait | Voice |
| --- | --- | --- | --- | --- |
| porter | The Night Porter | Private Secretary + Duty Officer | aide | Reads the board: room numbers, times, what he saw. Loyal, literal, quietly funny. Has a theory. |
| chef | Your Chef | General | hawk_general | Clipped, certain, hides blame in the passive voice. "I'm not saying the night manager forgot the eggs; I'm saying somebody did." |
| housekeeper | The Housekeeper | Foreign Minister | dove_fm | Long view, dry, weary, kind. Has seen every kind of guest. "We" for the hotel. |
| concierge | The Concierge | Spy Chief | intel_director | Knows everything, hedges to the exact degree. "One source, and he is drunk." Never says "I think". |
| events | The Events Manager | Spin Doctor | spin_doctor | Thinks in headlines and seating plans. Everything is "a moment". |
| doorman | The Doorman | Ambassador | ambassador | Every anecdote is a warning. Remembers 1991. |
| handyman | The Handyman | Cyber Chief + Scientist | cyber_director | On the intercom from the boiler room. Explains the boiler as if it were weather. |
| owner | The Owner | Chancellor | treasury | On the phone from abroad, in a dressing gown. Money, then a dry joke. His patience is a hidden value. |
| barman | The Barman | Admiral | admiral | Hours and distances. "Last orders was an hour ago and so, in a sense, was he." |
| room12 | Room 12 | Peace Movement | peace_leader | Resident since 1987. Wrote the rules on the card by the lift. Reasonable, lethal. |
| critic | The Critic in 212 | Press | press | Files at nine. Would rather write about the pillows. Her opinion is a hidden value. |
| lead | Tonight's lead guest | Ally's PM | ally_leader | The Bride's Mother, the Inspector, the Dog Show secretary: whoever the Booking is about. Their goodwill is a hidden value. |
| majestic | The Majestic | Hotline | hotline | The rival hotel across the square, by phone, formal, a beat late. "As a courtesy. Courtesies are remembered." |
| daymanager | The Day Manager | Opposition | opposition | Texts through the night, arrives at six. Reasonable in tone, lethal in timing. "I've brought my own pen." |
| partner | Your Partner | Partner | family | Texting from home. Soup, a bed, the cat. Short and real. Never a mechanic. |

Regard (hidden values, never shown, felt through faces and odds words): `trust_primary` =
the Owner's patience; `intel` = the Critic's opinion; `trust_secondary` = the lead guest's
goodwill; `commitment` = your promises (what you have said you would do tonight). Odds
tags: `owner`, `critic`, `guest`, `promise` (aliases of the engine's adversary / intel /
secondary / alliance terms).

Bars (engine meters): GUESTS = `public`, STAFF = `military`, MONEY = `economy`, THE
BUILDING = `allies`. `escalation` is unused and never shown or fatal in this pack.

## The Bookings (12 at launch)

| Booking | From | Tonight's idea |
| --- | --- | --- |
| THE SWAN | new | Room 412 has a swan in the bath. It gets out. |
| THE WEDDING | summit | Sixty for breakfast, no eggs, the groom is singing in the bar, and the Bride's Mother has a list. |
| THE ALARM | false_alarm | The panel says fire in Room 9. Room 9 is singing. Last time it was toast in 3B. (The warning true/false mechanism, one for one.) |
| THE CRITIC | defector | A critic has checked in under a false name and a man has come asking for her. |
| THE POWER CUT | undersea_cables | The lights go in the east wing, then the lift, then the fish tank. |
| THE INSPECTOR | ultimatum | The inspector is early, which he finds people prefer, and would like to see the kitchen with the lights on. |
| THE FLOOD | debris_cascade | A tap in 310, then the ceiling of 210, then the ballroom. |
| THE LIFT | satellite_blackout | The lift is stuck between three and four with a dog, a bride and the Owner's nephew. |
| THE BAND | proxy_incident | A band is in the ballroom that nobody booked, and they are very good. |
| THE MAN WHO ISN'T HERE | defector | Room 7 pays cash and would like the register to agree he never arrived. |
| THE SNOW | blockade | Nobody can leave, a coach party cannot arrive, and the bread van is a rumour. |
| THE DOG SHOW | new | Forty-one dogs, one lift, a judge in 118 with allergies. |

Each Booking: `opener` (slot 1), `beats` (3, with slot windows), `head` (slot 15–17), a
`lead` speaker, 3 star-band reviews (★★★★★/★★★★, ★★★, ★★) plus the pool's fall reviews
(one star, by the bar that emptied), a `quote` pool keyed on flags, and `full` comedy cards
for bars at 100 (shared pool).

## The voice contract (the validator enforces it under `voice: hotel`)

- A card is **two sentences, ≤ 150 characters**. First sentence the fact, second the pressure.
  Concrete nouns: a room number, a time, an object. Present tense. Spoken by a person.
- Choices **≤ 34 characters**, imperative, two clearly different actions, no ellipses.
- **Every side has a `reply` ≤ 80 characters**: the world's answer, the punchline, the
  consequence. Odds outcomes ≤ 120. The reply never explains a mechanic.
- Roles only on cards (The Chef, Room 12, The Critic in 212). Names live in the Guest Book.
- Time: everything happens tonight between 3:00 and 6:00. Banned: weekday names, tomorrow,
  yesterday, noon, midnight, next week, last week. A clock time named must be at or after
  the card's own time (the validator checks the slot window).
- Register: dry, warm, English sitcom, nobody is a villain, nobody dies. No slang that
  does not travel (no P45, hen do, stag do, gaffer). Wit is in what people say back to you.
- Banned words as before (no jargon of any trade), plus: synergy, stakeholder, KPI, brand,
  content, user, mechanic, dial, bar, meter, score.
- Every card moves at least one bar by **8 or more** (so a change is visible), no more
  than 25. A night's deck must be survivable from a healthy start on at least one path.

### Eight cards in the finished voice

1. 3:00 · THE NIGHT PORTER · THE SWAN opens — "Room 412 has a swan in the bath. I went up
   because I didn't believe it either, and I'd like it noted that I was polite to the swan."
   ← Move 412 upstairs. Leave the swan [GUESTS ▲ MONEY ▼] ↩ "412 takes the Penthouse.
   Quietly, which means she'll mention it later." | → Ring the wildlife people [GUESTS ▼]
   ↩ "A recorded voice says they open at seven. The swan does not."
2. 3:10 · YOUR CHEF — "Sixty down for breakfast and there are no eggs. I'm not saying the
   night manager forgot to sign for them; I'm saying somebody did." ← Wake the grocer. Pay
   double [MONEY ▼▼ STAFF ▲] ↩ "The grocer answers on the ninth ring and names a price.
   You say yes." | → Pancakes. Call it a theme [STAFF ▼ GUESTS ▼] ↩ "'Pancakes.' He says it
   once, and then goes to find a bigger pan."
3. 3:20 · THE CRITIC IN 212 — "I'm reviewing you, I'm in 212, and 310 is playing the drums.
   I file at nine, and I came here hoping to write about the pillows." ← Champagne. On the
   house [MONEY ▼ GUESTS ▲] ↩ "She takes the bottle and writes something down. Possibly the
   vintage." | → Move the drummer, not her [STAFF ▼ GUESTS ▲] ↩ "The drummer moves to the
   ballroom: louder, but further away."
4. 3:30 · THE HOUSEKEEPER · THE SWAN, beat one — "The swan is out of the bath and in the
   corridor, and it is faster than you'd think. The Porter is on the fire stairs with a
   towel and a theory." ← Towel. Catch it [STAFF ▼ GUESTS ▲] ↩ "Caught on the second
   landing. The towel is a loss; the Porter is fine." | → Open the terrace doors [GUESTS ▼]
   ↩ "It walks to the terrace, looks at the sea, and decides against it."
5. 3:40 · THE OWNER · on the phone from abroad — "Why is the terrace lit at twenty to four?
   Lights cost money, and nobody is on a terrace at this hour except people I'm not
   charging." ← Turn the lights off [MONEY ▲ GUESTS ▼] ↩ "The terrace goes dark. Somewhere
   out there, something hisses." | → Leave them on. Safety [MONEY ▼] ↩ "He says 'safety'
   once, in the voice of a man doing a sum."
6. 3:50 · THE HANDYMAN · on the intercom — "The boiler's making the noise from last time,
   and last time it stopped when I hit it. I can hit it now, or you've got hot water till
   about five." ← Hit it · Likely ↩ YES "One hit. Silence. He doesn't say anything, which is
   somehow worse." NO "It stops for a breath, then starts again, louder. So does he." |
   → Leave it. Hot water till five [BUILDING ▼] ↩ "'Five,' he says. 'Ish.' The intercom
   clicks off before you can ask."
7. 4:00 · THE MAJESTIC · by phone — "'The Majestic has heard about your swan and would be
   glad to take any guests you can't accommodate.' A pause. 'As a courtesy.'" ← Thank them.
   Send nobody ↩ "'Of course.' The line goes quiet in the way that is not the same as
   calm." | → Send them the swan [GUESTS ▲] ↩ "A long pause. 'The Majestic does not, at
   present, have a suitable bath.'"
8. 4:10 · YOUR PARTNER · texting — "There's soup in the pan and a bed upstairs, which I
   mention because you seem to have forgotten where it is. Also the cat has your side."
   ← Eat the soup. Ten minutes [STAFF ▲ GUESTS ▼] ↩ "Ten minutes of soup in a dark kitchen.
   The best ten minutes of the night." | → Not yet. Send a heart ↩ "A heart comes back.
   Then: 'I've screenshotted the time.'"

## The screens

1. **Home**, three states. First open: the mark, "It's 3am at The Brink. The phone is
   ringing.", one button CLOCK IN (a practice night). After that: TONIGHT · #n · THE SWAN ·
   SAME NIGHT FOR EVERYONE with ANSWER IT (or "Pick the phone back up · 4:10"), PRACTICE
   NIGHT, today's review card with SHARE if played, the streak (nights worked; one covered
   night a week), "Tomorrow: THE DOG SHOW", the key (the plate, price shown) and the gear.
   Nothing else above the fold.
2. **The Desk** (the night). Header: HOME (44px, always; leaving saves the night where it
   is), the clock (the only number), the bell (the one rule, sound, moods). Four horizontal
   bars with icon and word; brass above half, amber under a quarter, red under an eighth;
   ▲▼ stays on a bar until the next decision. The card: portrait, role as headline, two
   sentences, the time. Two 72px choice buttons with at-rest chips (which bars move);
   press-and-hold shows the full preview, release commits; drag and tilt kept. After a
   decision the reply slides in for 1.2 s (tap to skip), the bars move visibly with a tick
   or a thud, the clock ticks. No intro overlay, no banner over the card, no numbers.
3. **The Review** (replaces Dawn). HOME left, SHARE right. Stars, byline, the headline
   (the ending's name), the quote, two short paragraphs, the moment card, the one-row
   strip, AGAIN (same seed), "Tomorrow: THE DOG SHOW", the plate slip after a four- or
   five-star night. A fall is a review too: one star, stamped WALKOUT / STAFF WALKED /
   CLOSED BY THE OWNER / CLOSED BY THE FIRE BRIGADE, with the time.
4. **Guest Book** (reviews collected, by Booking, blank pages not redactions), **Settings**,
   **About**, **The Plate** (price, the five things, Buy, Restore by email).
   Gone: the seat picker, the record's unlock list, the Expert rows, the endings wall,
   every Expert word. Expert stays in the code behind the crisis pack and appears on no screen.

## The share object

Text, four lines: `BRINK #212 · THE SWAN ★★★★☆` / one row of nine cells, one per twenty
minutes, the colour of the lowest bar (🟩 above half, 🟨 below, 🟧 under a quarter, 🟥 the
cell you fell in, ⬜ after), ending 🌅 or 🌑 4:10 / `"Very calm about the swan. Less calm about
the Chef." — Room 412` / the link. PNG: hotel letterhead, stars, headline, quote in italic
serif, byline, clock and stamp, the row, the lapel badge (your name if bought).

## The purchase

One: **THE BRASS PLATE**, £2.99 / $3.99, the price on every button that mentions it, the
existing Stripe link → Worker → signed token → restore by email. It buys your name on the
plate (every review you share reads "Night manager Sam…"), the Archive (every past Tonight),
the Guest Book in full, Any Booking with seeds to send, and Rewind to the card the night
turned on. Offered the first time a player earns four or five stars, with the review
re-rendering live as they type their name; never after a loss, never on the first night.

## Targets (B1–B6, written before tuning; BALANCE.md "The hotel")

| # | Target |
| --- | --- |
| B1 | Careful bot reaches 6:00 on 60–75% of nights |
| B2 | Random bot reaches 6:00 on 15–25% |
| B3 | Star distribution across careful nights roughly 10/25/35/20/10 from one to five |
| B4 | No single review in more than 15% of nights |
| B5 | Median night 18 cards and ≤ 2.5 minutes at 7 s a card |
| B6 | Every Booking's dawn path exists from a healthy start on every bot |

## Schema additions (see CONTENT.md §6)

- Card: `minutes` (clock minutes this card takes, default 10), `remember` (flags that
  survive into the next night, prefix `memory:`), `slot` hints via bookings, `reply` on
  both sides, `odds.success.text` / `failure.text` required.
- Booking (`content/bookings/*.yaml`): `id`, `name`, `lead` (speaker id), `opener`,
  `beats: [{card, slot: [a, b]}]` × 3, `head: {card, slot: [a, b]}`, `flag`
  (`booking:<id>`, set at start), `teaser` (one line for "Tomorrow: …"), `reviews` by id.
- Ending (a review): `kind: survival` (made it to six) or `removed` (a fall), `stars` 1–5,
  `byline` (speaker id), `quote` ≤ 90 characters, `conditions.values.stars` to pick the
  band, the existing `text` (two paragraphs ≤ 420 characters), `moment_label`, `emoji`.
- Rules: `voice: hotel`, `night: { cards: 18, minutes: 10, one_sided: true, full_cards:
  { public: id, military: id, economy: id, allies: id }, first_night_scale: 0.85 }`.

## What is reused as-is

The engine (seeds, replay, meters, hidden values, conditions, flags, follow-ups, warnings
with true/false branches, odds, forced endings, serialisable mid-run state, the tests), the
schema and validator with the voice contract extended, store.ts save-on-every-card and the
history-aware back, the daily seed, record and streak, the share renderer's typography and
stamp, the Card's drag/tilt/stamp, the roll overlay's language, Stripe → Worker → token →
restore, PWA, itch zip, Capacitor/Tauri, analytics, the simulator and bots, the Playwright
harness, the audio synth, the palette and type. The 451 crisis cards are a quarry (arc
shapes, warning branches, the Partner, "courtesies are remembered"), never re-voiced.
