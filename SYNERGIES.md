# SYNERGIES.md — how the posture pieces combine

Pieces are the build. Each one is a list of composable modifiers (ENGINE.md §2);
when two are held, their additive terms sum and their multipliers multiply, in a
fixed order, so every interaction below is a consequence of the numbers, not a
special case in code. Content adds a second layer: cards gated on `pieces_any` /
`pieces_all` that only appear for a given build, and advisor personal lines that
fire when particular people share a cabinet.

The seven forces the brief asked for, and where they live mechanically:

| Force | Mechanism |
| --- | --- |
| Misperception | Warning truth rolls against intel reliability; `trust_variance` (Strategic Ambiguity); hidden values steering `adversary` odds |
| Time pressure | Timers scaled per act × difficulty × pieces; Pre-delegation picks the military side on expiry |
| Attribution ambiguity | `attribution`/`cyber` odds tags; pieces that unlock resolvable attribution lines; wrong attribution burns trust with the wrong power |
| Entanglement | Commercial Satellite Deal (+2 escalation on space; intel from a private asset that becomes a target), Cyber Unit (trust −2 on cyber always), Early-Warning jamming arcs |
| Commitment traps | `public_commitment` raises commitment; `walk_back` costs public × (1 + commitment × lock); Red Lines / Spin Doctor raise the lock |
| Security dilemma | Military tags cost trust (Contractor, Cyber Unit), trust drifts down under Missile Defence / Denial, trust lowers `adversary` odds at the flashpoints |
| Deterrence vs reassurance | Deterrence pieces buy `adversary` odds now and bleed trust later; reassurance pieces (NFU, Dove, Back-Channel) do the reverse; Minimal Deterrence caps drift but weakens deterrence |

## Designed interactions

Each entry: the pieces, the arithmetic, what it feels like, how it fails, and the
signature the simulator should show (checked in BALANCE.md).

### Military and deterrence

1. **The Arsenal — Hawk General + Defence Contractor.** Military gains ×2.1 on military/mobilise/deterrence choices; escalation on those choices +2 and hidden; every one also costs 2 economy and 2 trust with both rivals. Military races toward 100 (the junta ending) while trust collapses and the "?" hides the ladder you are climbing. *Sim signature:* highest `military_100` and nuclear share of any pair.
2. **The Cabinet at War — Hawk General + Dove FM.** Both lanes are amplified: military choices hit ×1.5, de-escalation cuts ×1.4 and costs less at home but bleeds allies. The advisor pair cards (`adv_*`) fire. A build that punishes indecision: whichever way you lean is stronger, dithering pays both bills. *Sim signature:* higher variance in ending kinds than either alone.
3. **Gunboats — Hawk General + Loyal Admiral.** Naval cards ×2 weight, naval military gains ×1.3×1.5, naval odds +10%, hidden escalation. The blockade arcs dominate the deck and each boarding looks free. *Fails* at the Line at Sea when the roll misses. 
4. **Sea Control — Loyal Admiral + Blue-Water Fleet.** Naval/blockade weight ×3.2, naval odds +20%, economy −1 on every naval move. You can win every fight at sea and lose the economy to fuel. Adding Strategic Reserve (economy floor 15) removes the brake entirely.
5. **Hair Trigger — Pre-delegation + Rapid-Response Brigade.** Timers ×0.75, expiries pick the military option, proxy odds +15%, escalation ×1.15/act from Week Three. Fast and lethal; the military floor at 20 keeps the officers loyal while the world burns. *Unlock path:* five expiries in one run.
6. **The Shield — Missile Defence Layer + Deterrence by Denial.** Intercept odds +35% makes The Intercept almost safe; trust with the primary rival drifts −0.45 per card (≈ −27 over a run), which is −13% on every `adversary` roll by the Endgame. The security dilemma as a number: the safer you are from missiles, the less they believe you at Midnight.
7. **Shield and Promise — Missile Defence + No First Use.** NFU's +0.34 trust drift cancels the shield's −0.2. Intercept +20%, first-use rolls +20%. Reassurance neutralises provocation; the cost is 2 military on every nuclear or de-escalation choice.

### Warnings and intelligence

8. **The Twitch — Launch on Warning + Paranoid Intel Director.** Warnings twice as frequent, reliability −12, and a live false alarm at an act end opens the flashpoint on its false-alarm entry, where the doctrine turns waiting into a timed launch decision. Deterrence odds +8% are the bait. *Sim signature:* the highest `nuclear_launch_on_warning` share; this pair must exist and must be bad.
9. **The Safe Trigger — Launch on Warning + Hardened NC3.** Truth rolls floored at 70% regardless of intel: false alarms become rare while LoW keeps its deterrence bonus and nuclear escalation costs ×0.8. The designed answer to (8). *Unlock:* survive to Week Three with LoW.
10. **Eyes Open — Launch on Warning + Early-Warning Constellation.** Warnings +60% and reliability +8: more real warnings, more pre-emption windows, and the blackout arc's jamming lines now threaten the very asset LoW depends on.
11. **Ground Truth — Cautious Intel Director + Signals Intercept.** Reliability +20, warnings halved, adversary trust shown as numbers. You see the hidden term in every `adversary` roll and act on warnings you can believe. *Costs:* fewer warning cards means fewer chances to pre-empt and the false-alarm drama rarely happens.
12. **The Flood — Paranoid Intel Director + Hardened NC3.** Twice the warnings, but at least 70% true: constant real pressure, few ghosts. Escalation climbs from acting on truth. Pair with Hotline Protocol to bleed it off.
13. **Triage — Chief of Staff + Paranoid Intel Director.** One burial per act tames the flood: bury the worst warning and keep the rest. The Fixer is worth most with the noisiest advisor.
14. **Reading the Room — Signals Intercept + Strategic Ambiguity.** Trust deltas get ±6 noise and you can *see* it: watch them misread you in real time and time your moves for the swings. Commitment gains halved keep your hands free.

### Attribution and entanglement

15. **Attribution — Cyber & Space Director + Cyber Unit.** Cyber/attribution/space cards ×2.24 weight, attribution odds +25%, resolvable attribution lines unlocked. But every cyber choice costs 2 trust with both rivals: knowing who did it makes retaliation tempting and retaliation makes the next attribution matter more.
16. **Entangled — Cyber Unit + Early-Warning Constellation + Commercial Satellite Deal.** Reliability +14, warnings +60%, +2 escalation on every space choice, economy drifting up from the deal. Everything you own is dual-use and everything dual-use is a target. The Cascade flashpoint is where this build is decided.
17. **Managed Openness — Transparency + Spin Doctor.** Secrecy costs 4 public but public swings are ×0.6, so secrets cost 2.4; reliability +10; commitment lock 1.0. Open by default, boxed in by your own statements.
18. **Owning It — Transparency + Cyber Unit.** Cyber costs trust; transparency choices earn trust ×1.3. Disclosing an intrusion (`cyber_ew:disclosed`) recovers what the unit costs. The rare build where admitting things is the mechanic.

### Commitment and diplomacy

19. **The Corner — Spin Doctor + Red Lines.** Public commitments +8 commitment and +2 public; combined lock 1.5 → at commitment 80, walking back costs public ×2.2 before damping (×1.32 after). Adversary odds +8%. Deterrence works until Midnight, when the only exits are expensive. *Sim signature:* high `fp:midnight_passed` and `nuclear_midnight` share.
20. **The Only Exit — Red Lines + Hotline Protocol.** The free de-escalation removes public, military and allies costs *before* the commitment trap multiplies them: one phone call per act lets you climb down from a red line for nothing. Commit hard, then call. The strongest legitimate pair; balanced by one charge per act.
21. **Fog — Strategic Ambiguity + Red Lines.** Ambiguity halves commitment gains, Red Lines adds +8 flat; trust noise ±6 swings "They blink" by up to ±3%; misperception and commitment-trap cards both ×1.5. A chaos build for players who like variance.
22. **The Word Kept — No First Use + Dove FM + Back-Channel.** Trust drifts +0.34/card, de-escalation trust gains ×1.3, back-channel odds +10% (+22% with the Old Ambassador). The Summit's communiqué becomes likely and the stand-down flavour "The Word Kept" is reachable. *Fails* from the inside: military −2 on nuclear/de-escalation, allies −2 per de-escalation → the coup or abandonment, not the war.
23. **The Quiet Room — Old Ambassador + Back-Channel.** Back-channel weight ×2.4, odds +22%, trust gains ×1.3. Secret talks dominate the deck; the public never sees the work, so public drifts on other cards. 
24. **The Long Table — Dove FM + Peace Movement Leader.** De-escalation: escalation ×1.4, public +4, public cost ×0.6. Deterrence costs 4 public and every de-escalation costs 2 allies. Allies is the meter this build loses; Alliance First or Allied Basing is the fix.
25. **Anchored Diplomacy — Dove FM + Alliance First.** Allies anchored toward 50 by 1/card cancels the Dove's bleed. Alliance choices raise commitment +3, so the price is autonomy: allied demand cards ×1.6.

### Economy and office

26. **The Bunker — Fortress + Treasury Hawk + Strategic Reserve.** Economy costs ×0.21 with a floor at 15: the economy cannot lose you the office. Allies drift −0.3/card and military −0.25/card (≈ −27 and −22 over a run): the office is lost by abandonment or the barracks instead. 
27. **Keel and Anchor — Alliance First + Allied Basing Rights.** Basing pushes allies up (+0.2/card, gains ×1.3); the anchor pulls anything above 50 back down. Allies sit at 50–55 forever, stable and unremarkable, while allied demand cards ×1.6 decide your policy. Stability that costs autonomy — the brief's "Alliance First" exactly.
28. **Fortress ⟂ Alliance First** are mutually exclusive (`excludes`): you cannot both close the borders and consult everyone. Likewise **Minimal Deterrence ⟂ Launch on Warning** and **Paranoid ⟂ Cautious Intel**.
29. **Acclamation — Peace Movement Leader + Civil Defence Programme.** Nuclear-tagged public costs ×0.5 and +2, de-escalation +4 public. Public can run *up* to 100 — the too-popular removal ending, where the constitution is suspended in your favour and the crisis outlives you. The rare build whose failure is being loved.
30. **The Ladder — Escalate to De-escalate + Hawk General.** Limited strikes cost half their escalation (E2D) plus a hidden +2 (Hawk), and each strike raises the escalation floor by 5 (max 60). Seven strikes put the floor at 35; an eighth makes a stand-down (escalation ≤ 35) mathematically impossible for the rest of the run. Players will discover this the hard way and it is the point.
31. **The Narrow Band — Escalate to De-escalate + Minimal Deterrence.** Ceiling 95, floor rising 5 per strike: the room to manoeuvre shrinks from both sides while military losses ×1.5 make the coup the likely exit.
32. **Restraint — Minimal Deterrence + No First Use.** No drift into war (ceiling 95), trust +0.34/card, but military losses ×1.5 and −2 on every nuclear/de-escalation choice, adversary odds −8%, more probes. The pacifist build fails by coup, never by war — a different ending profile the simulator must show.
33. **Iron Ledger — Defence Contractor + Treasury Hawk.** The Contractor's −2 economy per military move is damped to −1 by the Treasury's ×0.6; military ×1.4 fights the Treasury's −0.25 drift. Two advisors who despise each other and roughly cancel — the pair cards say so.
34. **Calling Down — Pre-delegation + Hotline Protocol.** Short timers, military defaults, and one free climb-down per act: a build that runs hot and vents once a week.

## How the simulator checks this

`npm run sim` reports, for the heuristic bot, the stand-down and nuclear rate for every
pair held together in ≥ 40 runs against the baseline of runs holding neither. The
target is at least 12 pairs whose stand-down rate differs by ≥ 10 percentage points.
Entries 1, 6, 8, 9, 19, 20, 22, 24, 26, 30, 32 are the ones expected to show first;
BALANCE.md records what actually did.
