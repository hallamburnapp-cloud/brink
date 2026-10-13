# Prototype spec: the playable slice

BRINK: NIGHT SLICE, A GREYBOX AN ENGINEER CAN BUILD WITHOUT ASKING
Effort: 5-7 engineer-days. Everything below is exact. Where this spec and the reference implementation agree, the reference implementation is the tie-breaker.

REFERENCE IMPLEMENTATION (Python, same rules, all worked examples)
/tmp/claude-0/-home-user/8a83eba3-4efc-53f8-a9ad-433378148d32/scratchpad/winner/
- board.py: the map.
- patterns.py: pattern detection.
- engine.py: scoring.
- crisis.py: crisis loop and greedy bot.
- spread.py and final_spread.py: choice-spread simulation.
- voronoi.py: border check and region areas.
- map.json: the map data.
- ex2.py, ex2b.py, ex3.py, ex4.py: the worked examples.
- calib2b.txt: the calibration table.
Port these files. Don't re-derive the rules.

================================================================
0. BUILD TARGET
- Repo: /home/user/brink. New code goes in src/war/, in four folders: engine/, content/, ui/ and sim/.
- Select it with VITE_GAME=war. Old code stays dormant.
- Stack: Preact + TypeScript. One <canvas> for the map, 390 x 520 CSS px at devicePixelRatio. The HUD is DOM.
- Logical viewport: 390 x 844 portrait, scaled uniformly to fit the window and letterboxed in the table colour #0B0F14. Desktop shows the same frame centred.
- Fonts (Google Fonts, open licence): Barlow Condensed for labels, JetBrains Mono for numbers, Saira Stencil One for pattern names.
- RNG: src/engine/rng.ts, unchanged. Use fork('deal'), fork('shop') and fork('twist').

================================================================
1. THE MAP (src/war/content/map.json, a copy of the scratchpad map.json)

COORDINATES
- Map frame: 390 x 520. Its portrait screen origin is (0, 171).
- (x, y) is the pin centre in map points.
- 'P' marks a port; the region on the other end of its sea lane follows in brackets. 'CAPITAL' marks a capital. 'nb' lists the joined regions.

THE CAP (colour CAP, #7CC4FF, triangle)
- NWK Northwake, weight 4, (62, 44), P [VSY]. nb: FRM, WNM, VSY.
- FRM Frostmere, weight 3, (158, 36). nb: NWK, WMS, WNM, GLM.
- WMS Wintermast, weight 10, (258, 40), CAPITAL. nb: FRM, GLM, KLM.
- WNM Wenmoor, weight 6, (104, 100). nb: NWK, FRM, GLM.
- GLM Glassmoor, weight 5, (204, 104), P [DRF]. nb: FRM, WMS, WNM, KLM, DRF.
- KLM Kellmark, weight 7, (316, 94), P [KLP]. nb: WMS, GLM, KLP.

HIGHMARCH (colour HMR, #3FBFA0, circle)
- VSY Vessary, weight 5, (38, 176), P [NWK]. nb: RMH, QLN, EDV, NWK.
- RMH Rimeholt, weight 3, (104, 170), P [GUL]. nb: VSY, EDV, GUL.
- QLN Quillon, weight 4, (30, 250). nb: VSY, EDV, ASK.
- EDV Edda Vale, weight 10, (92, 248), CAPITAL. nb: VSY, RMH, QLN, ASK, MRD.
- ASK Ashkettle, weight 6, (40, 330), P [BRN]. nb: QLN, EDV, MRD, BRN.
- MRD Morrow Downs, weight 7, (110, 322), P [TRN]. nb: EDV, ASK, TRN.

THE SCATTER (colour SCT, #E8C15A, diamond; each island is a disc of radius 24)
- GUL Gullrest, weight 3, (176, 192), P [RMH]. nb: DRF, TRN, LNK, RMH.
- DRF Driftholm, weight 4, (226, 186), P [GLM]. nb: GUL, LNK, GLM.
- TRN Tern Isle, weight 5, (172, 258), P [MRD]. nb: GUL, LNK, PBB, MRD.
- LNK Lantern Key, weight 10, (222, 258), CAPITAL. nb: GUL, DRF, TRN, PBB, SHL.
- PBB Pebbleby, weight 6, (178, 324), P [MRM]. nb: TRN, LNK, SHL, MRM.
- SHL Shoal, weight 7, (228, 324), P [LTL]. nb: LNK, PBB, LTL.

SUNDRY (colour SND, #EF7F6A, square)
- KLP Kelpmouth, weight 5, (298, 172), P [KLM]. nb: BRK, LTL, TLM, KLM.
- BRK Brackwater, weight 4, (362, 172). nb: KLP, TLM.
- LTL Lintel, weight 6, (290, 250), P [SHL]. nb: KLP, TLM, DNM, SHL.
- TLM Tallowmere, weight 10, (342, 246), CAPITAL. nb: KLP, BRK, LTL, DNM, ORN.
- DNM Dunmarrow, weight 3, (298, 330). nb: LTL, TLM, ORN.
- ORN Orrinth, weight 7, (356, 334), P [FLE]. nb: TLM, DNM, FLE.

FARSOUTH (colour FRS, #A98BFF, hexagon)
- BRN Brindle Coast, weight 6, (60, 418), P [ASK]. nb: MRM, ICW, ASK.
- MRM Marram, weight 10, (192, 410), CAPITAL and P [PBB]. nb: BRN, FLE, ICW, SLW, HRT, PBB.
- FLE Floe End, weight 7, (324, 418), P [ORN]. nb: MRM, HRT, ORN.
- ICW Iceward, weight 4, (98, 480). nb: BRN, MRM, SLW.
- SLW Saltwhite, weight 3, (196, 486). nb: MRM, ICW, HRT.
- HRT Hearth, weight 5, (296, 480). nb: MRM, FLE, SLW.

TOTALS
- 30 regions.
- 45 land joins: 36 mainland borders plus 9 Scatter causeways (GUL-DRF, GUL-TRN, GUL-LNK, DRF-LNK, TRN-LNK, TRN-PBB, LNK-PBB, LNK-SHL, PBB-SHL).
- 9 sea lanes, 54 joins in all.
- 18 ports and 5 capitals.
- Every colour has the weights {10, 7, 6, 5, 4, 3}.
- No region has more than one sea lane.

LANDMASS OUTLINES (greybox polygons, map points)
- CAP: (24,22) (120,12) (300,14) (354,38) (364,112) (300,130) (150,136) (60,126) (24,82)
- HMR: (10,148) (128,144) (134,206) (128,290) (136,356) (80,366) (12,356) (6,250)
- SND: (266,144) (382,148) (386,252) (382,360) (318,364) (270,354) (264,252)
- FRS: (18,392) (150,380) (250,378) (368,392) (374,502) (250,514) (120,514) (20,500)
- SCT: one disc of radius 24 per island pin.

REGION CELLS
- On the mainland, every point belongs to the nearest pin of its own landmass (Voronoi clipped to the outline).
- I verified that the borders this draws are exactly the land joins above, with none extra and none missing.
- Draw the Scatter causeways as 6 pt bars (#2A3A4A) between disc edges. Draw sea lanes as white 1.5 pt dashed lines (4 on, 4 off) from centre to centre.
- Bake once at build time: a region-ID mask (Uint8Array, 390 x 520) and the border paths.

HIT TESTING
- A tap is one mask lookup.
- Islands use a 44 pt hit circle.
- A tap on sea snaps to the nearest lit pin within 30 pt.

UNIT TEST: rasterise at 1 pt and assert that the drawn borders equal the land joins.

GREYBOX RENDERING
- Sea #0D1B2A. Land is its colour at 30% over #16222F, with 1 pt #0D1B2A borders.
- At each pin: an 8 pt glyph, the weight in 11 pt bold, a star on capitals and an anchor tick on ports.
- LIT: fill +35% brightness, a 16 pt glowing pin head, and the name in 9 pt below the pin.
- DARK: 30% opacity and a 6 pt dot.
- SPENT: 15% opacity and a small x.
- Bearing strip at map y 0-10: ticks every 39 pt and the label 'W → sweep → E' (8 pt, 40% white).
- Threads (traffic only appears from the second time a thread is used): 1.5 pt red #E0483C. Traffic 3-5: 2.5 pt. 6-9: 3.5 pt with a glow. 10 or more: 4.5 pt with the number shown.
- Brass pins: up to 3 drawn, then an 'x4' style badge.
- Influence glow: +3% fill brightness per scoring, capped at +40%.

================================================================
2. DECK AND DEAL
- At the start of each crisis the pile is every non-retired region, shuffled with rng 'deal'.
- The flashpoint is the first region of the pile. Lit = the first 8.
- Pins: 1 to 5, on lit regions only, plus one Airlift target if an Airlift is armed.
- SWEEP needs at least 1 pin (exactly 5 under FULL TABLE). Every pinned region (scoring or loose) becomes spent. Refill lit to 8.
- SWAP needs 1-5 pins selected and a swap left. The selected regions become spent. Refill lit to 8.
- REFILL: if the pile holds fewer regions than are needed, shuffle the spent regions into the pile first.
- Each crisis has 4 sweeps, 3 swaps, 8 lit regions and a maximum of 5 pins. The flashpoint stays the same all crisis.

================================================================
3. PATTERNS (src/war/engine/patterns.ts)

INPUTS
- S: the pinned set (1-5 regions).
- J: the joins. Land, lanes and cables; minus lanes and cables under GRIDLOCK; plus port-to-port joins while the Ferry Master is seated (and not under Gridlock).
- The components of S under J. c is the largest component.

CANDIDATES (pattern → the pins that score)
- SINGLE: always. Scores the heaviest pin (ties go to the westmost).
- LINK: if c has 2 pins. Scores c.
- TWO LINKS: if there are 2 or more components of exactly 2 pins. Scores those two pairs.
- CHAIN: if c has exactly 3 pins. Scores c.
- FRONT: if c has exactly 4 pins. Scores c.
- NETWORK: if c has 5 pins. Scores S.
- SURROUND: if some region R is not in S, is not retired, has 3 or more neighbours in J, and all its neighbours are in S. Scores the neighbours of R. If several R qualify, take the one with the highest neighbour weight sum, then the westmost R.
- WORLDWIDE: if |S| = 5 and the pins have 5 different colours. Scores S.
- BLOC: if |S| = 5 and the pins are one colour. Scores S.
- WHOLE BLOC (secret): if some colour has 3-5 non-retired regions and all of them are in S. Scores those regions.
- AROUND THE WORLD (secret): if |S| = 5, S is connected and it has 5 colours. Scores S.

CHOOSING
Pick the candidate with the largest (base Influence at its level) x (base Momentum at its level). Ties go to the higher rung.

LADDER (rung order: base Influence, base Momentum, Influence per level, Momentum per level)
- SINGLE 5, 1, +10, +1
- LINK 10, 2, +15, +1
- TWO LINKS 20, 2, +20, +1
- WORLDWIDE 30, 2, +25, +2
- CHAIN 30, 3, +20, +2
- FRONT 45, 4, +25, +3
- SURROUND 50, 5, +30, +3
- NETWORK 70, 6, +35, +3
- BLOC 90, 8, +40, +4
- WHOLE BLOC 140, 12, +50, +4
- AROUND THE WORLD 180, 15, +50, +5
At level L, the value is base + (L - 1) x gain. All patterns start at level 1. The two secrets show as ??? in Run Info until made.

================================================================
4. SCORING ENGINE (src/war/engine/score.ts)
Pure and deterministic, all BigInt. It returns {leverage, pattern, scoringSet, topRegion, trace[]}.

NUMBER TYPES
I is Influence. M10 is Momentum in tenths. 'x1.5' means M10 = M10 * 3n / 2n (floor). 'x2' means M10 *= 2n. '+4 Momentum' means M10 += 40n.

THE ORDER
1. TWIST (see section 7).

2. PATTERN BASE: set I and M10 to the pattern's values at its level.

3. SWEEP: sort the scoring set by (x, y). For each pin p:
   times = 1
     + 1 if p is the flashpoint
     + 1 if p has an ECHO stamp
     + 1 if the Courier is seated and p is first in the order
     + 1 if the Signals Officer is seated and p is a Capital
     (each Deputy copying the Courier or the Signals Officer adds 1 more under the same condition).
   For t = 0 .. times-1:
   (a) I += weight + 5 x the brass pins on p.
   (b) Only when t = 0: for each already-scored q joined to p, I += traffic(p, q), or 3 x traffic with the Rail Clerk seated.
   (c) Stamp: FORTIFY I += 20. RELAY M10 = M10 * 3 / 2.
   (d) Pin staff, seat 1 to 5:
       - Harbourmaster: if p is a Port, I += 15.
       - Surveyor: if p's weight is 4 or less, I += 15.
       - Governor: if p is a Capital, M10 += 50.
       - Admiral: if p is a Port, M10 = M10 * 3 / 2.
       - The Sovereign: if p is a Capital, M10 *= 2.
   Then mark p scored.
   BLACKOUT: pins of the blacked-out colour skip (a)-(d) entirely, but still count for the pattern.

4. STANDBY: lit regions that are not pinned, in (x, y) order. Chief of Staff: if the region is a Capital, M10 = M10 * 3 / 2 (once per Chief, and once more per Deputy copying it).

5. DESK, seat 1 to 5:
   - Duty Officer: M10 += 40.
   - Quartermaster: I += 30.
   - Hotline Operator: if the largest joined group among the scoring pins has 3 or more pins, M10 += 80.
   - Mediator: if the pinned count is 3 or fewer, M10 *= 3.
   - Strategist: if the largest joined group among the scoring pins has 4 or more pins, M10 *= 2.
   - Envoy: if the scoring pins cover 4 or more colours, M10 *= 2.
   - Old Hand: I += its count.

6. LEVERAGE = I * M10 / 10n (floor).

7. COMMIT (on SWEEP only):
   - every joined pair inside the scoring set gains traffic +1;
   - Old Hand's count += 5;
   - add the leverage to the crisis total;
   - clear the crisis if the total is at or above the target.

DEFINITIONS
- 'Capital' includes Promote, and every region while the Herald is seated.
- 'Port' includes both ends of any cable.
- DEPUTY = an exact copy of the nearest non-Deputy staff to its right, acting at the Deputy's own seat. It copies the rule, the count and the timing. Copying the Herald, the Ferry Master or the Rail Clerk adds nothing. With nothing to its right, it does nothing.
- topRegion = the scoring pin whose (a)-(d) steps added the most Influence (ties go to the westmost). If this sweep clears the crisis, it gets the brass pin.

THE CLEARS LAMP
Run the same function silently on the current selection, and light the lamp if leverage >= target - total. Never display that number.

TRACE EVENTS
Format: {i, phase: 'pattern'|'pin'|'thread'|'stamp'|'staff'|'again'|'standby'|'desk'|'slam', region?, other?, seat?, staffId?, op: 'base'|'+I'|'+M'|'xM'|'again'|'slam', amount: string, I: string, M10: string}.
The UI, audio, tests and bots all consume the trace. The UI never recomputes scores.

================================================================
5. THE 20 STAFF (src/war/content/staff.ts)
Each entry gives: ID, name (object), rarity, price, sell value, timing, then the rule. Sell value = floor(price / 2), minimum 1.

1. DUTY, Duty Officer (desk lamp). Common, ◆3, sells for 1. Desk: +4 Momentum.
2. QM, Quartermaster (supply crate). Common, ◆3, sells for 1. Desk: +30 Influence.
3. HARBOUR, Harbourmaster (ship's bell). Common, ◆4, sells for 2. Pin: each Port that scores +15 Influence.
4. SURVEYOR, Surveyor (theodolite). Common, ◆4, sells for 2. Pin: each scoring region of weight 4 or less +15 Influence.
5. HOTLINE, Hotline Operator (red telephone). Common, ◆4, sells for 2. Desk: +8 Momentum if 3 or more scoring pins are joined.
6. GOVERNOR, Governor (wax seal). Common, ◆5, sells for 2. Pin: each Capital that scores +5 Momentum.
7. TREASURER, Treasurer (cash box). Common, ◆4, sells for 2. On clear: +4 Funds.
8. OLDHAND, Old Hand (tin mug). Common, ◆5, sells for 2. Desk: +Influence equal to its count. Its count grows by 5 after every sweep, starting at 0, and is shown on the mug.
9. RAILCLERK, Rail Clerk (timetable). Uncommon, ◆6, sells for 3. Rule: threads add triple their traffic.
10. MEDIATOR, Mediator (teacup). Uncommon, ◆6, sells for 3. Desk: x3 Momentum if you pinned 3 regions or fewer.
11. STRATEGIST, Strategist (folded map). Uncommon, ◆7, sells for 3. Desk: x2 Momentum if 4 or more scoring pins are joined.
12. ENVOY, Envoy (diplomatic bag). Uncommon, ◆7, sells for 3. Desk: x2 Momentum if the scoring pins cover 4 or more colours.
13. COURIER, Courier (leather satchel). Uncommon, ◆6, sells for 3. Again: the first pin in the sweep scores twice.
14. FERRY, Ferry Master (ferry timetable). Uncommon, ◆7, sells for 3. Rule: all Ports count as joined to each other. While it is seated, draw dotted arcs between ports.
15. SIGNALS, Signals Officer (morse key). Rare, ◆8, sells for 4. Again: Capitals score twice.
16. ADMIRAL, Admiral (brass telescope). Rare, ◆8, sells for 4. Pin: each Port that scores x1.5 Momentum.
17. CHIEF, Chief of Staff (clipboard). Rare, ◆9, sells for 4. Standby: each lit Capital you did not pin x1.5 Momentum.
18. DEPUTY, Deputy (carbon paper). Rare, ◆10, sells for 5. Copy: copies the staff to its right.
19. HERALD, Herald (paper crown). Rare, ◆8, sells for 4. Rule: every region counts as a Capital.
20. SOVEREIGN, The Sovereign (signet ring). Legendary. Not sold in the shop; it appears only in the Late Shift sandbox (sells for 10). Pin: each Capital that scores x2 Momentum.

SHOP POOL: staff 1-19.

RARITY RIMS: Common pewter #8A8F98, Uncommon brass #C9A35B, Rare silver-blue #9DB8D9, Legendary gold #F2C94C.

SEAT CHIPS (shown on each seat): +4M, +30I, +15⚓, +15≤4, +8M·3, +5M★, +4◆, +nI (the live count), thr×3, ×3≤3, ×2·4, ×2·4c, 1st×2, ⚓=⚓, ★×2, ×1.5⚓, ×1.5★sb, COPY, all★, ★×2M.

================================================================
6. CONSUMABLES

GENERAL RULES
- Papers sit in the IN-TRAY, which has 2 slots.
- ORDERS cost ◆3 and sell for ◆1.
- Use an Order during a crisis (before a sweep) or in the Briefing: tap it to arm it, then tap or drag on the map.
- Every effect is drawn on the map and is permanent.
- A region holds one stamp; a new stamp replaces the old one.

THE 8 ORDERS
O1 FORTIFY: up to 2 regions get the FORTIFY stamp (+20 Influence each time they score). Draw hatched borders.
O2 RELAY: 1 region gets the RELAY stamp (x1.5 Momentum each time it scores). Draw a double ring.
O3 ECHO: 1 region gets the ECHO stamp (it scores twice). Draw a doubled pin head.
O4 LAY CABLE: drag from one region to another region not already joined to it. They are joined from now on, and both become Ports. Draw a brass line.
O5 DEFECT: tap a source region, then up to 2 other regions. They take the source's colour, with a 600 ms ink spread.
O6 PROMOTE: 1 region becomes a Capital (draw a star). Its weight is unchanged.
O7 RETIRE: up to 2 regions leave the deck for the run. They are shuttered dark, never light again, and are ignored by Surround.
O8 AIRLIFT: during a crisis only. Tap any region that is not spent, lit or dark. It joins your current pins (it counts towards the 5) and is spent after the sweep.

PLAYBOOKS (◆3)
- Applied the moment you buy one; never held in the tray.
- One per public pattern (9 in all), each giving +1 level.
- The secret patterns' Playbooks (Whole Bloc, Around the World) are offered only after that pattern has been made this run.

================================================================
7. THE RUN: 3 HOURS, 9 CRISES

STARTING STATE
◆5, 5 seats, 2 in-tray slots, 4 sweeps, 3 swaps, 8 lit regions and up to 5 pins per sweep.

TARGETS (Flare-up / Standoff / Summit)
- Hour 1 (22:00): 300 / 450 / 600. Summit twist GRIDLOCK: sea lanes and cables are cut. Only land borders and causeways join, and the Ferry Master is suspended.
- Hour 2 (23:00): 900 / 1,350 / 1,800. Summit twist BLACKOUT: at the start of the Hour, rng 'twist' picks one colour and shows it. Regions of that colour still count for patterns but add nothing and trigger nothing.
- Hour 3 (00:00): 2,500 / 3,750 / 5,000. Summit twist FULL TABLE: every sweep must use exactly 5 pins, and SWEEP is disabled otherwise. Swaps are unaffected.

SHOWING THE TWIST
From the start of each Hour, the Big Board shows a chip reading 'SUMMIT: <NAME>'. During the Summit itself, the effect is painted on the map: lanes crossed out, a colour darkened, or five pin sockets on the readout.

ON A CLEAR
- Reward: Flare-up 3, Standoff 4, Summit 5.
- +1 for each unused sweep.
- Interest: +1 per ◆5 held before the payout, capped at +4.
- Overwhelm: +1, +2 or +3 if the crisis total reached 2x, 4x or 8x the target.
- Treasurer: +4.
- A brass pin goes on topRegion of the clearing sweep. That region adds +5 Influence per brass pin each time it scores.
- Then the Briefing opens.

ON A MISS
After the 4th sweep, if the total is below the target, show 'THE WORLD TIPPED · 23:00 STANDOFF' (with the actual Hour and crisis), the night map and the best sweep, with one button: NEW NIGHT.

AFTER THE 00:00 SUMMIT
Show 'END OF SLICE · YOU HELD UNTIL 01:00' with the night map, best sweep and staff. Two buttons:
- NEW NIGHT;
- KEEP GOING, for testing only: 01:00 is 6,000 / 9,000 / 12,000, then each Hour is x2.2, and each Summit draws a random twist from the three above.

WHAT PERSISTS FOR THE WHOLE RUN
Traffic, brass pins, stamps, cables, colours, retired regions, pattern levels, staff counts and Funds.

CALIBRATION
From the reference bot, 200 crises per row, with no airlift and no carried-over traffic, Playbooks or stamps.
- No staff: 300: 100%. 450: 100%. 600: 98%. 900: 90%. 1,350: 71%. 1,800: 34%. 2,500: 7%. Gridlock at 600: 84%.
- One Duty Officer: 1,800: 92%. 2,500: 50%. 3,750: 10%.
- Duty Officer + Hotline Operator: 2,500: 99%. 3,750: 83%. 5,000: 59%. Blackout at 1,800: 100%.
- Duty Officer + Hotline Operator + Strategist: 3,750: 97%. 5,000: 93%. Full Table at 5,000: 92%. 9,000: 54%.
- A random tapper clears 300 only 9% of the time.

================================================================
8. THE BRIEFING (SHOP)
It opens after every clear except the slice's last.

OFFERS
- 2 offer slots. Type by weight (rng 'shop'): staff 70, Order 15, Playbook 15.
- Staff rarity: Common 70 / Uncommon 25 / Rare 5. Pick uniformly within the rarity, among staff that are not seated and not already on offer. If that rarity is empty, fall back to the next rarity down.

FOLDER
- 1 folder slot: either a Recruit Folder, ◆4 (choose 1 of 3 staff, or SKIP), or an Orders Folder, ◆4 (choose 1 of 3 Orders, or SKIP), 50/50.
- The first Briefing always has a Recruit Folder.

REROLL
◆4, then ◆5, ◆6 and so on, resetting each Briefing. It rerolls the 2 offer slots only.

SELL
Tap a seated staff or an in-tray paper to show a 'SELL ◆n' balloon.

LIMITS
A staff needs a free seat, and an Order needs a free in-tray slot. Playbooks apply at once.

LEAVING
NEXT CRISIS →.

PRICES
Staff as listed in section 5. Orders ◆3, Playbooks ◆3, folders ◆4.

================================================================
9. SCORING ANIMATION

GENERAL
- All times are at 1x speed. 2x and 4x divide every duration.
- A tap anywhere jumps to the final state of the slam.
- Reduced motion: no shake and no flying numbers. The counters update in place, the whole sequence takes 1.2 s or less, and all sounds stay.

THE SEQUENCE
- t = 0: SWEEP pressed. The lever button depresses over 120 ms. Haptic vibrate(15). Sound: tally_slam at intensity 0.1 (the thock).
- 0-150 ms: everything that isn't scoring fades to 30% opacity, and loose pins turn grey.
- 150-350 ms:
  - threads between scoring pins grow from 1 to 2 pt;
  - the pattern name stamps into the readout, scaling from 1.4 to 1.0 over 200 ms (ease-out-back), with tally_slam at intensity 0.2;
  - the two boxes flip to the base values (split-flap, 3 flips of 60 ms each).

- From 450 ms: SWEEP EVENTS.
  - Every scoring pass is an event, including AGAINs. Event k (counting from 0) lasts d_k = max(120, round(320 x 0.94^k)) ms. From the 13th event onwards, each takes 60 ms.
  - Inside an event:
    - +0 ms: the scan line (2 pt white, with a 40% glow) jumps to the pin's x. The region flashes white for 80 ms, then holds its colour at 70%. Sound: tally_tick with intensity min(1, k/12). Haptic vibrate(8). A cyan '+w' label (14 pt) rises from the pin and flies to the Influence box over 200 ms; the box updates when it lands.
    - +60 ms: each thread back to an already-scored pin pulses from that pin to this one over 100 ms, and pops '+traffic' if the traffic is above 0.
    - +100 ms: the stamp pulses ('+20' or 'x1.5'), with tally_mult at intensity 0.4.
    - +120 ms onwards, 60 ms apart: each firing pin staff hops 6 pt on the rail (120 ms) and flings its number to the matching box.
      - A '+' plays tally_mult at intensity 0.4.
      - A 'x' plays tally_mult at intensity 1.0, adds an 80 ms shake of 2 px, and pulses the Momentum box from scale 1.0 to 1.1 and back.
  - AGAIN events: the scan line snaps back over 80 ms, an amber 10 pt 'AGAIN' tag appears, and the retrigger sound plays.
- STANDBY: 200 ms per firing standby region. A blue pulse plays on the region, and its 'x' flies to Momentum.
- DESK: 250 ms per firing desk staff, in seat order, with the same hop, fling and sound rules. Staff that don't fire stay still.

- SLAM (200 ms): the cyan box slides in from the left and the amber box from the right, and they collide.
  - Sound: tally_slam at intensity min(1, log10(leverage) / 9). Haptic vibrate(30).
  - Shake, from r = leverage / (target - total before this sweep):
    - r below 0.25: none;
    - 0.25 to 1: 2 px;
    - 1 to 10: 5 px;
    - 10 or more: 9 px, plus a 600 ms map flash in topRegion's colour.
    - Every shake lasts 250 ms.
- +200 ms after the slam: the product prints on the Big Board as a right-to-left flap cascade (400 ms, or 600 ms at 1e6 or above). Then the crisis total ticks up (300 ms, or 600 ms if r is 10 or more). The flashpoint ring's radius shrinks to max(0, 1 - total/target) of its starting radius.

- HEAT: the moment the running I x M10 / 10 during the events reaches (target - total), the Big Board backlight goes from #FFB547 to #FFF6E0 over 150 ms and the threads glow white until the slam.

- CLEAR:
  - the ring collapses over 300 ms, with ante_smash;
  - a white shockwave ring expands from the flashpoint, radius 0 to 640 pt over 600 ms (2 pt stroke, fading), and each region it crosses blinks for 80 ms;
  - CLEARED is stamped on the Big Board (scale 1.6 to 1.0 over 150 ms, tilted 3°);
  - the brass pin drops onto topRegion (a 250 ms fall and a 60 ms bounce, with tally_slam at intensity 0.15);
  - Funds tick up one coin at a time, 90 ms apart, with the capital sound;
  - after 400 ms the Briefing tray rises (300 ms).

- MISS: no slam flourish. The drone fades and ante_miss plays. The lights go out region by region in random order over 2,000 ms, then the summary card fades in.

REFERENCE DURATIONS
- Example 1, sweep 1: about 2.5 s.
- Example 2: about 3.5 s to the total, about 5 s to the Briefing.
- Example 3 (10 events): about 4.3 s.

================================================================
10. SCREEN LAYOUT, PORTRAIT 390 x 844 (rects are x, y, w, h)

BACKGROUND
#0B0F14 with a 6% vignette.

SAFE AREA
0, 0, 390, 47.

BIG BOARD: 0, 47, 390, 60. Background #12161C, with 1 pt #2A3038 flap seams.
- Clock '23:00' at 16, 51 (17 pt mono, #E8E2D0).
- Crisis 'STANDOFF ●●○' at 16, 73 (9 pt caps).
- Summit chip 'SUMMIT: BLACKOUT' at 16, 87 (8 pt, #FF5A4E).
- 'LEVERAGE' label at 112, 50 (8 pt).
- Crisis total: 28 pt split-flap in 112, 60, 124, 32, right-aligned. Then '/ 1,350' (14 pt) from x 240, sharing its baseline.
- Hints (first night only) replace the leverage area: 13 pt, centred in 104, 49, 196, 52, up to 2 lines. Each shows for 3.5 s or until the next tap.
- Funds coin: 304, 57, 70, 40, a 20 pt coin and '◆ 11' (18 pt).
- Progress rule: 0, 103, 390, 4. It fills amber and turns white at the target.

STAFF RAIL: 0, 107, 390, 64.
- Seats of 64 x 58 at x = 17, 90, 163, 236, 309, y = 110.
- Each seat shows its number (7 pt, top left), a 34 pt icon centred at y + 24, and a chip in the bottom 16 pt (8 pt text). Old Hand also shows a count tag.
- Empty seats are a 1 pt dashed outline.
- Tap: a rule balloon of 220 x 40 appears below the seat, over the map.
- Long-press (300 ms) and drag to reorder; the other seats slide aside over 150 ms.

MAP: 0, 171, 390, 520.

READOUT: 0, 691, 390, 48.
- Pattern name at 16, 697 (20 pt stencil), then 'Lv n' (11 pt). With nothing selected it shows 'Tap lit regions' (14 pt, 50% white).
- INFLUENCE box: 196, 695, 86, 40. 2 pt cyan #5FD4F4 border, value in 22 pt tabular figures, label 'INFLUENCE' in 7 pt.
- 'x' at 284, 703 (16 pt).
- MOMENTUM box: 300, 695, 74, 40, amber #FFB547.

CONTROLS: 0, 739, 390, 68.
- SWAP: 16, 745, 96, 56. Outline style, 'SWAP' (15 pt) over '3 left' (10 pt).
- In-tray slot 1: 120, 745, 52, 56. Slot 2: 178, 745, 52, 56. Each shows the Order's icon and name (8 pt).
- SWEEP: 238, 745, 136, 56. Brass, 'SWEEP' (17 pt) over '4 left' (10 pt). Shown at 40% when disabled.
- CLEARS lamp: a 12 pt circle at 352, 751, grey when off and #5BE37D when on.

HOME INDICATOR
0, 807, 390, 37.

THE BRIEFING
- The tray (linen #E9E2D2 at 8% over #1A1F27) slides up to 0, 451, 390, 356 over 300 ms. The map stays visible from y 171 to 451.
- Header: 'BRIEFING · next: STANDOFF 1,350' at 16, 463.
- Offer cards: 16, 489, 171, 150 and 203, 489, 171, 150. Each has a 48 pt icon, the name (14 pt), the rule (11 pt, up to 2 lines), a rarity rim and a price tag at the bottom right.
- Folder card: 16, 651, 171, 88.
- REROLL ◆n: 203, 651, 171, 40.
- NEXT CRISIS →: 203, 699, 171, 40.
- An open folder shows 3 cards of 110 x 150 at x 16, 140 and 264 (y 489), with SKIP at 16, 651.
- Long-pressing any offer highlights on the map where it acts.

RUN INFO
Tap the readout. A sheet covers 0, 171, 390, 520 and lists the 11 patterns (name, level, Influence x Momentum, secrets as ???).

END SCREENS
The map at 100%, with a card at 24, 200, 342, 300 and a NEW NIGHT button at 24, 520, 342, 56.

================================================================
11. THE FIRST NIGHT (seed 'FIRST-NIGHT', used only on first launch)

CRISIS 1 (22:00 Flare-up, 300)
- Flashpoint: LNK.
- Lit: LNK, GUL, SHL, EDV, QLN, NWK, ICW, HRT.
- The pile continues FRM, WNM, WMS, then the rest in rng order.

HINTS, IN ORDER
1. On entering: 'Hold the world together until dawn.' (2 s)
2. 'Tap a lit region.', with a finger pulse on LNK.
3. After the first pin: 'Pins that touch join up.'
4. Once 3 pins are joined: 'Sweep.'
5. At Briefing 1: 'Hire staff. They sit at your table and fire every sweep.'

BRIEFING 1 (fixed)
Offers: Duty Officer ◆3 and Harbourmaster ◆4. Folder: a Recruit Folder ◆4 holding the Hotline Operator, the Quartermaster and the Courier.

LATER ONE-TIME HINTS
- On the first deal with no joined pair: 'Nothing joins? Select regions and SWAP them.'
- After buying the first Order: 'Drag it onto the map.'
- After the 22:00 Standoff: 'SUMMIT: GRIDLOCK. Sea lanes are cut.'

EXPECTED RESULT
Chain 180, then Front 272: a total of 452, Funds 11, and a brass pin on Wintermast.

================================================================
12. SANDBOXES (title buttons in the greybox)

LATE SHIFT
- Setup:
  - Overtime 10:00 Flare-up, target 600,000,000.
  - Seats: Herald, Governor, Signals Officer, Deputy, The Sovereign.
  - Network at level 6.
  - LNK carries 2 brass pins.
  - Traffic: EDV-MRD 6, MRD-TRN 9, TRN-GUL 4, GUL-LNK 3, TRN-LNK 7.
  - Flashpoint: HRT.
  - Lit: EDV, MRD, TRN, LNK, GUL, ICW, HRT, BRK.
  - Funds ◆40.
- Pin EDV, MRD, TRN, GUL and LNK for 10,559,856,944 (shown as 10.6B), 17.6x the target.
- Seats can be dragged between sweeps:
  - Governor last: 8,651,450,444.
  - Deputy copying the Signals Officer: 415,461,382.

MID SHIFT
- Setup:
  - 01:00 Standoff, target 9,000.
  - Seats: Harbourmaster, Hotline Operator, Strategist.
  - Network at level 3.
  - KLP is Fortified.
  - Traffic: SHL-LTL 2, LTL-TLM 3, KLP-TLM 2, KLM-KLP 1.
  - Flashpoint: TLM.
  - Lit: SHL, LTL, TLM, KLP, KLM, EDV, ICW, DRF.
- Pin SHL, LTL, KLP, KLM and TLM for 10,920. With seats 2 and 3 swapped: 8,736.

================================================================
13. SOUND AND HAPTICS
- Use src/audio/sfx.ts as it is; there are no audio files.
  - tally_tick: each pin.
  - tally_mult: each + and each x.
  - retrigger: AGAIN.
  - tally_slam: the slam, the stamp and the pin drop.
  - ante_smash: a clear.
  - ante_miss: a loss.
  - capital: each coin.
  - offer: shop cards appearing.
- src/audio/drone.ts: its pitch follows (target - total) / target.
- Haptics: navigator.vibrate where supported.

================================================================
14. TESTS, HOOKS AND SIMULATOR GATES

UNIT TESTS (vitest)
- The map: 30 regions, 45 land joins, 9 lanes, at most one lane per region, and drawn borders equal to the land joins.
- Pattern detection:
  - every example in this spec;
  - 3 + 2 pins gives CHAIN;
  - 2 + 2 + 1 gives TWO LINKS;
  - Surround picks the heaviest ring;
  - Whole Bloc becomes possible after Retire.
- AROUND THE WORLD is impossible on the starting map: check all C(30,5) = 142,506 five-sets.
- Worked examples, exactly:
  - Example 1: 180, then 272.
  - Example 2: 10,920 / 8,736 (seats swapped) / 2,556 (no staff).
  - Example 3: 10,559,856,944 / 8,651,450,444 / 415,461,382.
- Determinism: the same seed produces the same trace hash in Chromium, WebKit and Firefox (Playwright).

DEV-ONLY HOOK
window.__war = {seed(s), state(), pin(ids), sweep(), swap(ids), buy(slot), next(), sandbox('late'|'mid')}

SIMULATOR (src/war/sim, a port of crisis.py)
Bots:
- random;
- greedy: enumerate every subset of up to 5 pins, take the highest leverage, and swap when best x sweeps left < 0.8 x the remaining target;
- builder: greedy, plus buying the best-value staff.
Gates before the owner sees the build (reference results in brackets):
- the best legal play is at least 3x the median in 90% or more of fresh deals [96%];
- no pattern is the best play in more than 30% of deals [29%];
- the random bot clears the 22:00 Flare-up 15% of the time or less [9%];
- greedy with no staff clears the 22:00 Flare-up 95% or more [100%] and the 00:00 Flare-up 15% or less [7%];
- greedy with Duty Officer + Hotline Operator clears the 00:00 Flare-up 90% or more [99%].

================================================================
15. REUSE AND RETIRE

REUSE
- rng.ts.
- sfx.ts, engine.ts and drone.ts.
- The doShake pattern and reducedMotion() from src/ui/store.ts.
- storage.ts.
- The harness shape of src/sim/simulate.ts.
- playwright.config.ts.

LEAVE DORMANT
run.ts, leverage.ts, the cards, the meters and the old UI. Do not adapt them.

================================================================
16. OUT OF SCOPE (fake or skip)
- Final art: use flat colours, glyphs and simple object icons.
- Music beyond the drone.
- Saving and resuming.
- Meta progression and unlocks.
- The Daily Map.
- Doctrines and Alert levels.
- War Room Upgrades, Gambits and Medals.
- Skipping and Favours.
- The other 12 Orders and the other 40 staff.
- The landscape layout.
- The share card.
- Payments and store builds.

================================================================
17. ALONGSIDE THE BUILD (not engineering)
One painted portrait screen of the war room mid-cascade, at final quality, so the owner judges the look and the loop separately.

================================================================
18. GO OR NO-GO
- 5 of 5 new players can state the goal within 60 s.
- At least 4 of 5 make a Front or better by crisis 2.
- At least 3 of 5 reorder seats without a hint.
- At least 1 plays for an hour unprompted.
- The simulator gates pass.
- The owner plays three runs, presses Late Shift, and says this is the game he meant.
