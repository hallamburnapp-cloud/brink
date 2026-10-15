# War room: visual language

This is the art direction for the playable slice. Engineers building the map, the HUD and the icons should follow it to the letter. Every value here is also live in working code you can copy:

> **Win the World (v2) overrides three things here** (docs/war/v2/SPEC.md section 8): colour means ownership, so free regions are one neutral grey (#83868A at three luminance levels, no bloc hue and no bloc glyph on the map) and gold is never dimmed; the bearing strip ("W — SWEEP — E") is cut; and there are no brass tacks or order badges on the map (a gold check marks each region a send would win). The materials, type and everything else below still hold.

| File | What it is |
| --- | --- |
| `style-frame.webp` / `.html` | The 390 x 844 portrait war room mid-cascade (23:00 Standoff, NETWORK Lv 2, scan line on the third pin, HEAT on). |
| `style-briefing.webp` / `.html` | The Briefing tray risen over the map after that crisis cleared. |
| `style-sheet.webp` / `.html` | The specimen sheet: tokens, plate tones, type, every material in every state, the icons, and the map in its everyday choosing state (which neither frame shows). |
| `lib/tokens.css` | Every colour, font stack and easing curve as a CSS custom property. Copy the names one to one. |
| `lib/war-room.css` | The DOM components: Big Board, split-flap tiles, seats, boxes, brass, lamp, in-tray, Briefing cards. |
| `lib/map-render.js` | The map painter: one canvas, layers in the order this document gives. Port it into `src/war/ui/map/`. |
| `lib/icons.js` | Staff objects and paper stamps as inline SVG, plus the small glyphs the fonts lack. |
| `lib/textures.js` | Procedural grain (leather, felt, linen) from SVG turbulence. No image files. |
| `lib/kit.js` | Builders for the Big Board, the rail and the OS chrome used by both frames. |
| `tools/render.mjs`, `tools/map-data.mjs` | Render a page to PNG; copy `map.json` into `lib/map-data.js`. See Tooling. |

Spec-fixed values (PROTOTYPE-SPEC.md) are marked **[spec]**. Where this document and the spec's section 1 "greybox rendering" disagree, this document wins: those were placeholder values. Rects never change: they are always the spec's section 10 rects.

---

## 1. The idea in one paragraph

A dark room at night. The only strong light is the **back-lit glass plotting table**: the world is drawn on it in tinted glass plates, and lit regions glow from a lamp underneath. Everything around the table is a physical object under one small desk lamp **above and to the left**: a split-flap Big Board in a steel housing, a leather rail with brass-rimmed seats on felt, a brass SWEEP lever, typed linen Orders with rubber stamps. Colour only carries meaning (cyan is Influence, amber is Momentum, red is the target and the threads, green is "this clears"). The numbers are the brightest things on screen; the map is the biggest.

**Hierarchy, brightest to darkest:** the Influence and Momentum boxes and the flying numbers, then the leverage tiles and the lit and scoring regions, then the brass controls and the staff objects, then labels, then the dark world, then the room.

## 2. The light model

- **One key light, top-left, warm.** Every bevel is light on its top and left edges, dark on its bottom and right. Every cast shadow falls down and to the right (x +1 to +3, y +1.5 to +4, depending on height).
- **The table is its own light source.** Lit regions are lit from below (a radial pool centred on the pin), so they need no top-left bevel beyond the plate edge.
- **The Big Board is a lightbox.** Its backlight leaks through the gaps between the flaps: amber normally, white-hot under HEAT.
- **Glow means energy.** Only things that carry a live value glow: the two boxes, flying numbers, HEAT threads, the CLEARS lamp, the flashpoint ring, the scan line. A static label never glows.

## 3. Palette

All tokens are in `lib/tokens.css`. Never use pure white (`#fff`) for text: the board white is `--text #E8E2D0`.

### Room, table and housings

| Token | Hex | Use |
| --- | --- | --- |
| `--room-0` | `#06080B` | Letterbox edge, deepest vignette |
| `--table` | `#0B0F14` | **[spec]** Background and letterbox |
| `--room-1` | `#0F141A` | Console panels |
| `--board` | `#12161C` | **[spec]** Big Board housing |
| `--board-seam` | `#2A3038` | **[spec]** Flap seams, module dividers |
| `--flap-hi` / `--flap-hi-2` / `--flap-lo` / `--flap-lo-2` | `#20262E` / `#181C22` / `#121519` / `#0D1013` | Split-flap halves, top to bottom (see 5.2) |
| `--ink` | `#040608` | Cuts, deepest shadow |

### Leather, felt, linen, kraft

| Token | Hex | Use |
| --- | --- | --- |
| `--leather-0` / `-1` / `-2` | `#120C08` / `#1D150F` / `#2B2018` | Staff rail and console (base is `-1`) |
| `--stitch` | `rgba(233,214,178,0.20)` | 1 pt dashed stitching on the rail |
| `--felt-0` / `-1` / `-2` | `#0B1118` / `#121A24` / `#1A2633` | Seat insets: deep navy wool, never green |
| `--linen` | `#E9E2D2` | **[spec]** Paper (Orders, receipt, labels) |
| `--linen-shade` / `--linen-edge` | `#D8CFBB` / `#B7AC93` | Paper's lower half, torn edges |
| `--type-ink` | `#2A2520` | Typewriter ink on linen |
| `--kraft` / `--kraft-lo` | `#B8915C` / `#8C6A3D` | Folders |
| Stamp ink | `#C4372C` | Rubber stamps on paper (Orders, RECRUIT) |

### The plotting-table sea

| Token | Value | Use |
| --- | --- | --- |
| `--sea` | `#0D1B2A` | **[spec]** Base fill |
| backlight pool | radial at (203, 239), r 322: `rgba(30,62,92,.55)` → `rgba(18,38,58,.25)` at 55% → `rgba(4,9,15,.55)` | The lamp under the glass |
| `--graticule` | `rgba(157,184,217,0.055)`, 0.5 pt | Grid every 39 pt (x from 39, y from 49) |
| `--graticule-cross` | `rgba(157,184,217,0.20)`, 0.6 pt | 5 pt registration crosses at every grid node |
| `--sea-shelf` | `rgba(38,78,112,.38)` blur 16 + `rgba(46,92,130,.22)` blur 5 | Shallow-water halo around every coast |
| contours | 0.7 pt rings 7 pt and 15 pt off the coast, `rgba(157,184,217,.11)` and `.06` | Chart depth lines |
| `--lane` | white at 50%, 1.5 pt, dash 4/4 | **[spec]** Sea lanes, centre to centre |
| `--causeway` | `#2A3A4A`, 6 pt | **[spec]** Scatter causeways, disc edge to disc edge |

### Land: one jewel tone per bloc, five states

The plates are tinted glass. Unlit glass is a hand-picked dark jewel tone per bloc (mixing a warm hue into the navy sea turns it to mud, so we do not). Lit, scored and flash states mix the bloc colour over its dark tone, then add the lamp core: a radial from the pin, radius 58 pt (30 pt on islands), `core` at the centre, 28% of that at 45% radius, and `rgba(0,0,0,.16)` at the edge.

| Bloc **[spec]** | dark (in the pile) | spent | lit | lit core | scored | scored core | flash core |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAP `#7CC4FF` triangle | `#172E46` | `#122538` | `#5082AE` | `#99D1FF` @ 50% | `#6EAFE5` | `#BEE2FF` @ 85% | `#C4E4FF` @ 80% |
| HMR `#3FBFA0` circle | `#0F352E` | `#0E282C` | `#2A826E` | `#69CDB5` @ 50% | `#38AC90` | `#9FDFD0` @ 85% | `#A9E2D4` @ 80% |
| SCT `#E8C15A` diamond | `#34301A` | `#212622` | `#99813E` | `#EDCF7E` @ 50% | `#CFAD51` | `#F4E0AD` @ 85% | `#F5E3B5` @ 80% |
| SND `#EF7F6A` square | `#3C1D1A` | `#251C22` | `#A05447` | `#F39B8B` @ 50% | `#D6715F` | `#F7BFB5` @ 85% | `#F8C5BC` @ 80% |
| FRS `#A98BFF` hexagon | `#251E44` | `#191D37` | `#6F5BAD` | `#BCA5FF` @ 50% | `#977CE5` | `#D4C5FF` @ 85% | `#D8CBFF` @ 80% |

- Dark plates get a faint core instead: the bloc colour at 7% at the pin, `rgba(0,0,0,.12)` at the edge.
- Flash fills with the pure bloc colour, then its core.
- **Influence glow** (+3% per scoring, capped at +40%, spec 1): fill the plate with the bloc colour at `glow x 0.6` over everything above.
- **Dimmed during a sweep** (spec 9, "fades to 30%"): non-scoring plates take `--ink` at `(1 - dim) x 0.85`, where dim is 0.3 for unpinned lit regions and 0.55 for everything else; the whole sea first takes `rgba(6,10,15,.32)`. The world must stay legible as a world while the scoring plates blaze.
- BLACKOUT (Summit): the blacked-out bloc's plates and coast hairline take the spent tone and its glyphs go to 30%. Draw a 1 pt `--alarm` hatch at 20% across its plates so the cause is visible.

### Metals

| Metal | hi / base / lo | Use |
| --- | --- | --- |
| Brass | `#F7E0A3` / `#C9A35B` **[spec]** / `#6A4F22` (+ `#E3C078`, `#9E7B3B`, deep `#3A2A10`) | SWEEP, NEXT CRISIS, Funds coin, price tags, Uncommon rim, trim lines, pins |
| Pewter | `#C9CDD4` / `#8A8F98` **[spec]** / `#4D525A` | Common rim, outline buttons |
| Silver-blue | `#DDE9F7` / `#9DB8D9` **[spec]** / `#56708F` | Rare rim |
| Gold | `#FFE9A6` / `#F2C94C` **[spec]** / `#A37C16` | Legendary rim (adds a 10 px gold glow), capital stars |

### Meaning

| Token | Hex | Means | Hi (text on dark) | Deep (box fill) |
| --- | --- | --- | --- | --- |
| `--influence` | `#5FD4F4` **[spec]** | Influence, `+` to Influence | `#D4F6FF` | `#08202A` |
| `--momentum` | `#FFB547` **[spec]** | Momentum, `+`/`x` to Momentum, the board's backlight | `#FFE7BD` | `#241606` |
| `--thread` | `#E0483C` **[spec]** | Threads | | |
| `--heat` | `#FFF6E0` **[spec]** | HEAT: board backlight, thread filament | | |
| `--clears` | `#5BE37D` **[spec]** | CLEARS lamp, CLEARED stamp | | |
| `--alarm` | `#FF5A4E` **[spec]** | Target number, flashpoint ring, Summit chip, live crisis dot | | |
| `--standby` | `#6FA8FF` | Chief of Staff standby pulse; a cooled flashpoint | | |

### Text on dark

`--text #E8E2D0` (primary), `--text-2` 64%, `--text-3` 40%, `--text-4` 22% of the same colour. Labels sit at `--text-3`; nothing important goes below `--text-2`.

---

## 4. Type

Three faces, self-hosted (`public/war/fonts/fonts.css`). Numbers are **always** JetBrains Mono with tabular figures (`font-variant-numeric: tabular-nums`) so counting digits never jitter.

| Role | Face | Weight | Size (pt) | Tracking | Case | Colour |
| --- | --- | --- | --- | --- | --- | --- |
| Crisis total (split-flap) | JetBrains Mono | 800 | 28 **[spec]** | 0 | | `--text` |
| Clock (split-flap) | JetBrains Mono | 800 | 17 **[spec]** | 0 | | `--text` |
| Target `/ 1,350` | Mono 700 (slash: Barlow 500 15, 70%) | 700 | 14 **[spec]** | -0.03em | | `--alarm` at 92% |
| Funds amount | JetBrains Mono | 800 | 18 **[spec]** | -0.02em | | `--brass-hi` |
| Box values | JetBrains Mono | 800 | 22 **[spec]** | -0.02em | | `--influence-hi` / `--momentum-hi`, 10 px glow |
| Box labels | Barlow Condensed | 700 | 7 **[spec]** | 0.20em | caps | box colour at 85% |
| `x` between boxes | JetBrains Mono | 700 | 16 **[spec]** | | | `--text-2` |
| Pattern name | Saira Stencil One | 400 | 20 **[spec]** | 0.02em | caps | `--linen`, 14 px glow at 18% |
| `Lv n` | JetBrains Mono | 700 | 11 **[spec]** | | as is | `--text-2` |
| `Tap lit regions` | Barlow Condensed | 500 | 14 **[spec]** | 0.04em | sentence | white at 50% |
| Board labels (`LEVERAGE`) | Barlow Condensed | 700 | 8 **[spec]** | 0.22em | caps | `--text-3` |
| Crisis name (`STANDOFF`) | Barlow Condensed | 700 | 9 **[spec]** | 0.16em | caps | `--text-2` |
| Summit chip | Barlow Condensed | 700 | 8 **[spec]** | 0.12em | caps | `--alarm`, 1 pt border at 50%, fill 10% |
| Hints (first night) | Barlow Condensed | 600 | 13 **[spec]** | 0.02em | sentence | `--text` |
| Button title | Barlow Condensed | 700 | 15 (SWEEP 17) **[spec]** | 0.20em (SWEEP 0.24em) | caps | `--text`; on brass `#2A1C08` engraved |
| Button sub (`2 left`) | Barlow Condensed | 600 | 10 **[spec]** | 0.16em | caps | `--text-3`; on brass `#2A1C08` at 72% |
| Seat number | JetBrains Mono | 700 | 7 **[spec]** | | | `--text-3` |
| Seat chip | JetBrains Mono | 800 | 8 **[spec]** | -0.01em | | by meaning: `--influence` or `--momentum`; qualifiers `--text-2` |
| Region name (lit, pinned) | Barlow Condensed | 600 | 9 **[spec]** | 0.6 px | caps | `--linen` 92%, 2.6 pt dark halo |
| Region weight (lit, pinned) | JetBrains Mono | 800 | 11 **[spec]** | | | linen mixed 20% with the bloc, 3 pt dark halo |
| Region weight (dark, spent) | JetBrains Mono | 700 | 8.5 | | | the bloc mixed 45% into linen, at 62% (spent 32%) |
| Flying `+w` from a pin | JetBrains Mono | 800 | 14 **[spec]** | -0.02em | | `--influence-hi`, 3 pt dark stroke, 10 px cyan glow |
| Flying staff number | JetBrains Mono | 800 | 18-20 | -0.02em | | as above, in the colour of its box |
| Thread pop `+2` | JetBrains Mono | 800 | 11 | | | `#D4F6FF`, 3 pt deep-cyan halo |
| AGAIN tag | JetBrains Mono | 800 | 10 **[spec]** | 0.1em | caps | `--momentum` |
| Briefing header | Barlow Condensed | 700 / 500 | 12 / 11 | 0.28em / 0.08em | caps / lower | `--linen`, `next:` `--text-3`, crisis and target `--alarm` |
| Offer name | Barlow Condensed | 700 | 14 **[spec]** | 0.10em | caps | `--linen` |
| Offer rule | Barlow Condensed | 500 | 11 **[spec]**, 13 leading | 0.02em | sentence | `--text-2`; the effect in its meaning colour, 700 |
| Order name and rule (typed) | JetBrains Mono | 800 / 400 | 14 / 10.5 | 0.12em / -0.01em | caps / sentence | `--type-ink`; the effect in stamp ink |

**Glyphs the fonts do not have.** The subsets cover Latin-1 and U+2000-206F only. Draw these as inline SVG (`lib/icons.js`) and never as text, or iOS will substitute an emoji or a system face: `◆` (diamond: `diamond()`), `⚓` (`anchorGlyph()`, and `anchor()` on canvas), `★` (`starGlyph()`, `starPath()` on canvas), `●`/`○` (CSS circles), `→` (`arrowGlyph()`), and the five bloc glyphs (`blocGlyph()`, `glyphPath()` on canvas). `x`, `·` and `,` are in the fonts.

**Overflow rule.** Pattern names longer than the 172 pt before the Influence box (AROUND THE WORLD, WHOLE BLOC) scale down uniformly to fit, never below 15 pt, never wrapping. Region names never wrap; at 9 pt the longest (BRINDLE COAST, MORROW DOWNS) fit.

---

## 5. Materials

### 5.1 Brass (SWEEP, NEXT CRISIS, price tags, coin, trims)

```css
border: 1px solid #4A3614; border-radius: 9px;
background: linear-gradient(180deg, #F7E0A3 0%, #E3C078 16%, #C9A35B 50%, #A9843F 78%, #9E7B3B 100%);
box-shadow: inset 0 1px 0 rgba(255,250,230,.75),   /* top bevel catches the lamp */
            inset 0 -2px 0 rgba(58,42,16,.45),     /* bottom bevel */
            0 4px 0 #3A2A10,                       /* the 4 pt skirt: the button's depth */
            0 6px 10px rgba(0,0,0,.6);             /* cast shadow */
/* brushed grain: ::after, repeating 3 px horizontal lines (white 5% / black 4% / clear), 50% */
```

- Engraved text: `#2A1C08` with `text-shadow: 0 1px 0 rgba(255,240,200,.5)`.
- **Pressed:** `translateY(3px)`; gradient `#EDD08E 0% / #DCB872 18% / #C19A52 55% / #9C793D 100%`; shadows become `inset 0 2px 4px rgba(58,42,16,.55), inset 0 -1px 0 rgba(255,240,200,.25), 0 1px 0 #3A2A10, 0 2px 4px rgba(0,0,0,.6)`. The skirt shrinks from 4 to 1: that is the press.
- **Disabled:** 40% opacity **[spec]**, no glow, the lamp off.
- Trim line (where glass meets console): 2 pt, `rgba(247,224,163,.55)` to `rgba(106,79,34,.7)`, with a 1 pt black line under it.
- Funds coin: `coin()` in `lib/icons.js` (gradient rim, inner disc, raised diamond lit top-left, one specular arc).

### 5.2 Split-flap tile

| | Clock | Crisis total |
| --- | --- | --- |
| Tile | 12 x 20, gap 1.5 | 21.5 x 32, gap 2, five tiles right-aligned in 112,60,124,32 |
| Digit | 17 pt Mono 800 | 28 pt Mono 800 |
| Separator | colon: two 2.4 pt dots | comma: a 6 pt dark plate with a comma-shaped slot lit by the backlight |

```css
border-radius: 2.5px;
background: linear-gradient(180deg, #20262E 0%, #181C22 49%,   /* upper half, lit from above */
                                    #07090B 49%, #07090B 51.5%, /* the cut */
                                    #121519 51.5%, #0D1013 100%); /* lower half, in shadow */
box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 1px 0 rgba(0,0,0,.9), 0 2px 5px rgba(0,0,0,.6);
```

- The digit is drawn **under** a 1 pt `#030405` cut (with a 1 px 5% white line under it), so the cut splits the glyph like a real flap. The lower half of the glyph is 14% darker.
- Hinge pins: a 3 pt bar through the cut that pokes 1.5 pt out each side, `#3A414B` only at the ends.
- Unused leading positions are blank tiles, not hidden: an empty Solari board still shows its flaps.
- **Backlight:** a panel behind the tiles, `rgba(255,181,71,.85)` with `0 0 10px 2px` amber at 45% and `0 0 26px 6px` at 16%. Its light shows only through the gaps between tiles and as a soft spill above and below. Under HEAT it becomes `rgba(255,246,224,.95)` (150 ms crossfade, spec 9) and the digits get `text-shadow: 0 0 10px rgba(255,246,224,.35)`. The clock has a quieter amber panel at 45%.
- **The flip** (spec 9: 3 flips of 60 ms per box, a right-to-left cascade of 400 ms on the board): each flip is two phases. (1) 0-55%: the upper leaf rotates `rotateX(0 → -90deg)` about the cut with `perspective(70px)`, `--ease-flap-fall`, darkening to `brightness(.55)`; the new upper half is already behind it. (2) 55-100%: the leaf, now carrying the new lower half on its back, rotates `90deg → 0` onto the lower half with `--ease-flap-land`, which overshoots by about 4 degrees (the clack), brightening back. At the 90-degree point the leaf is a 1 pt line: hide it for one frame. The frame shows the 6 mid-phase-2: a 31% high foreshortened leaf at `brightness(.62)`.
- The cascade: tiles flip from the rightmost, each starting 40 ms after its right neighbour, each running its own 3 flips through the intermediate digits.

### 5.3 Big Board housing

- `--board` with `linear-gradient(180deg, rgba(255,255,255,.035), transparent 40%, rgba(0,0,0,.25))`; `inset 0 1px 0 rgba(255,255,255,.05)`.
- Two engraved module dividers at x 104 and 299: 1 pt `--board-seam` with a 1 pt black line to their right, inset 4 pt top, 6 pt bottom.
- Four 4 pt screws at the corners (radial `#6A717C → #2A3038 → #15191E`, lit top-left).
- An ambient glow over the leverage module: radial at (50%, 62%), amber at 20% (white-hot at 26% under HEAT), `mix-blend-mode: screen`.
- Progress rule 0,103,390,4 **[spec]**: track `#06080B` with an inset shadow; fill `#8A4F08 → #E79A2C 70% → --momentum` with an 8 px amber glow; a 3 pt `--momentum-hi` leading edge with a white-amber bloom. At the target it turns `#D8CFBB → --heat`.
- CLEARED stamp: 132 x 34 at 108,59, rotated -3 deg **[spec]**; Saira Stencil 23 pt `--clears`, 0.12em; 2.5 pt border plus a 1 pt inner outline at 45%, inset 6 pt; fill `rgba(12,30,18,.95)`; glow `0 0 18px` green at 40%. It covers the tiles completely: a stamp is not a label.

### 5.4 Leather (staff rail 0,107,390,64 and console 0,739,390,68)

- Base `--leather-1`, lit by `linear-gradient(180deg, rgba(255,220,170,.05), transparent 30%, rgba(0,0,0,.35))`.
- Grain (`--leather-grain`): fractal noise 1.1 (3 octaves) as black at `1.1R - .42`, plus 0.9 noise as `#FFDBA8` at `.5R - .26`, plus a slow 0.03 mottle as `#6B4729` at `.6R - .22`.
- The rail has two 1 pt dashed stitch lines at 2.5 and 60.5 pt from its top, 6 pt in from each end, `--stitch`. It casts `0 3px 6px rgba(0,0,0,.55)` onto the table and the table shows a 16 pt shadow band under it.

### 5.5 The staff seat (64 x 58 at x 17, 90, 163, 236, 309, y 110 **[spec]**)

- **Rim:** 1.5 pt, `linear-gradient(145deg, rim-hi, rim 40%, rim-lo)` in the rarity metal; radius 7. Shadow `0 2px 0 rgba(0,0,0,.55), 0 4px 7px rgba(0,0,0,.5)`.
- **Felt inset:** radius 5.5, `--felt-1` + `--felt-grain` (fine 1.7 fibres, light blue-white at `.55R - .27`; 0.6 black at `.6R - .2`) + a soft top-left sheen; inset shadow `0 2px 4px rgba(0,0,0,.7)`.
- **Object:** 34 pt, centred on seat y + 24 **[spec]**, `drop-shadow(1.5px 2px 1.5px rgba(0,0,0,.6))`. It sits on the felt; it is never framed.
- **Number:** 7 pt at 4.5, 3.5.
- **Chip:** the bottom 15 pt, `#0A0E13 → #06080B`, 1 pt top hairline at 6% white; 8 pt Mono 800, coloured by what it feeds: `+4M` amber, `+15⚓` cyan, `x2·4` amber with `·4` in `--text-2`.
- **Firing** (spec 9 hop): `translateY(-6px)` over 120 ms (50 ms up on `--ease-out`, 70 ms down on `--ease-in`); the cast shadow stays on the leather and softens; the chip floods with its meaning colour (`#0D3A48 → #072431` for cyan) and its text goes to `-hi` with a glow; two pairs of 6 pt sound lines in `--brass-hi` flick out either side of the object for the hop.
- **Empty:** 1 pt dashed `rgba(233,226,210,.24)`, radius 7, a recessed `rgba(0,0,0,.18)` inset, the number and `VACANT` (7 pt, 0.24em, `--text-4`).
- **Legendary** adds a 10 px gold glow outside the rim.

### 5.6 Linen paper (Orders, receipt, labels)

- Fill `#F2ECDF → --linen 60% → --linen-shade`; weave (`--linen-grain`) is two stretched noises, `0.9 x 0.06` and `0.06 x 0.9`, in `#6B5C42` at about 15%.
- Radius 2-3 pt at most. Paper sits slightly crooked in a tray (-2.5 deg) and straight on a Briefing card. Shadow `0 1px 0 rgba(0,0,0,.3), 0 3px 5px rgba(0,0,0,.55)`.
- Typed text is JetBrains Mono in `--type-ink`. A ruled line is 0.5 pt at 25% ink.
- Rubber stamps: stamp ink `#C4372C`, rotated -6 deg, through the speckle filter in `stampFilter()` (fractal noise 1.1, alpha `-1.5n + 1.75`) so the ink is never vector-clean.
- Receipt: torn bottom edge, a 3 pt zigzag every 5%.
- Folder: kraft gradient `#C8A26A → --kraft 60% → --kraft-lo`, a 66 x 16 tab top-left, a linen label, three paper sheets peeking with 3 pt rarity-colour tops.

### 5.7 The plotting-table map (one canvas, layers in this order)

1. **Sea:** `--sea`, then the backlight pool (section 3).
2. **Graticule** and registration crosses (39 pt grid).
3. **Shelf halo**, then **depth contours** (both drawn from the coast shapes by blur and by stroke-minus-stroke; use `shadowBlur`, never `ctx.filter`, which older Safari lacks).
4. During a sweep only: the sea veil `rgba(6,10,15,.32)`.
5. **Plate contact shadow:** fill all land with `shadowBlur 7, offsetY 2.5, rgba(0,0,0,.55)`.
6. **Plates**, one per region, clipped to (coast ∩ Voronoi cell): tone, lamp core, Influence glow, dim.
7. **Terrain:** marching-squares isolines of a seeded value-noise field (two octaves: weight 0.7 on a 34 pt grid, 0.3 on a 15 pt grid; levels .38/.46/.54/.62/.70; 3 pt cells), 0.6 pt `rgba(233,226,210,.07)` (`.045` during a sweep), clipped to land. Bake once.
8. **Borders:** each cell edge as a 1 pt `rgba(5,10,16,.9)` etch with a 0.7 pt 6% white line offset (+0.7, +0.7) beside it.
9. **Bevel:** inside each coast, a 3 pt stroke (1.5 visible) with a linear gradient across the landmass's bounds: `rgba(255,250,235,.30)` top-left, `.06` middle, `rgba(0,0,0,.45)` bottom-right. Unlit islands use 45% of that.
10. **Coast hairline:** 0.75 pt, the bloc colour mixed 75% over the sea, at 75%.
11. Stamps (FORTIFY hatching: 1 pt linen lines at 55% every 4.5 pt at 45 deg, kept to a 6 pt band inside the border, plus a 2 pt linen edge at 50%).
12. Causeways and sea lanes.
13. Old threads (traffic), then the flash bloom, then live threads, the thread pulse, the flashpoint ring, the scan line.
14. Markers: pins and heads, weights, tags, names, win checks (v2: no brass tacks, no order badges).
15. The glass finish (grain, sheen, vignette, rail shadow). (v2: the bearing strip is cut.)

**Coastline.** Round each outline corner with a quadratic of radius 6 pt (or half the shorter edge), resample every 2.5 pt, and push each point along its normal by two octaves of periodic value noise: amplitude 1.1 pt over about 12 pt and 0.45 pt over about 5 pt (seed `1009 + 7919 x i` per landmass, mulberry32). Internal borders stay straight bisectors, so the drawn joins are exactly the land joins; clip the Voronoi cells against the outline's bounding box grown 12 pt, then clip by the coast path at draw time. Hit-testing keeps using the spec's unrounded mask: the drawn coast stays within about 3 pt of it.

**Islands:** discs of 24 pt **[spec]**, same plate recipe, the lamp core at radius 30.

**Pins and markers** (centred on the region's point):

| State | Marker |
| --- | --- |
| Dark | the bloc glyph, 6 pt, the bloc mixed 55% over the sea; weight 8.5 pt to the right |
| Lit | a 16 pt glowing head: 15 pt warm halo `rgba(255,240,210,.55 → 0)`, a 7.5 pt radius disc `#FFF → #FFF1D6 → #E8D2A8` with a 6 px warm glow, the bloc glyph inside at 62% of the bloc colour; weight 11 pt; name 9 pt below at +15.5 |
| Pinned | a brass pin seen from above: cast shadow (r 7.5, blur 5, +3/+4), brass collar r 8.5 (radial `#F7E0A3 → #E3C078 40% → #9E7B3B 75% → #5A4219`), glass head r 6.2 in the bloc colour (radial from white-mixed-70% at top-left to 42% darkness at the edge), a 1.9 x 1.15 white specular at (-2.3, -2.7) |
| Spent | a 5 pt x in linen at 42% |
| Capital | a gold 5-point star after the weight (r 4 lit, 3.2 dark) |
| Port | a 7 pt stroked anchor after the weight |
| Sweep order | a 5 pt radius badge at (-8.5, -8.5): dark with a linen number before the pin scores, linen with an ink number after |
| Brass pins earned | 4 pt brass tacks at (-16, +2), stepping 5 pt left, up to 3, then `x4` in 7 pt brass **[spec]** |

### 5.8 Threads

| Traffic | Width **[spec]** | Recipe |
| --- | --- | --- |
| 1-2 | 1.5 pt | body `--thread`, 5 px red glow at 30%; a cast shadow 0.6 pt wider at (+1.4, +2.2), black 50%; a top highlight 28% of the width in `rgba(255,190,170,.4)` |
| 3-5 | 2.5 pt | same |
| 6-9 | 3.5 pt | glow at 70% |
| 10+ | 4.5 pt | plus the count, 8 pt Mono 800 linen, at the midpoint |

- **Live** (between the current scoring pins): at least 2 pt **[spec]**, full opacity.
- **HEAT:** a 10 px `#FF5A3C` glow at 100%, an inner core 62% of the width in `rgba(255,170,120,.9)`, and a filament 26% of the width in `--heat`. It reads as red-hot cord, not white wire.
- **Pulse:** a 3 pt `--heat` comet (35% of the thread long) with a 2.6 pt head and a 10 px glow, running pin to pin in 100 ms **[spec]**. The traffic pop sits beside the midpoint.

### 5.9 The flashpoint ring

- Radius = `max(0, 1 - total/target) x 72 pt` **[spec rule; 72 pt is the art's start radius]**.
- 2 pt `--alarm` with an 8 px glow; four reticle ticks from r+3 to r+8 at the bearings; a soft inner bloom (`--alarm` at 16% at 80% of the radius).
- Cooled (after the clear): the same ring in `--standby` at radius 13 pt, no bloom: a record of where the night was won.

### 5.10 Scan line, glass

- Scan line: 2 pt white at 95% with a 10 px glow at 40% **[spec]**, the full height of the map; behind it a 44 pt wake to the west, `rgba(255,246,224,0 → .07)`. A white cursor (8 x 7.5 pt triangle) marks its x at the map's top edge, only while it sweeps.
- (v2: the bearing strip, a ticked ruler with a `W ——— SWEEP ———▸ E` plate across the top of the map, is cut: it meant nothing a player could act on, and the sweep itself shows the order.)
- Glass finish: grain (one speck per device pixel, alpha 0-22 of 255, at 50%), a top-left sheen (`rgba(220,235,255,.05)` fading by 45%), an edge vignette (`rgba(3,6,10,.5)` beyond 78% of the height), and the rail's shadow band.

### 5.11 The two boxes

```css
border: 2px solid var(--c); border-radius: 6px;
background: radial-gradient(90% 90% at 50% 100%, var(--glow-in), transparent 75%),
            linear-gradient(180deg, var(--deep), #05080B);
box-shadow: 0 0 14px var(--glow-out), inset 0 0 10px var(--glow-in), inset 0 1px 0 rgba(255,255,255,.12);
/* Influence: --c #5FD4F4, --deep #08202A, glow-in 22%, glow-out 30%. Momentum: #FFB547, #241606, 22%, 28%. */
```

- **Bump** (a number lands, 120 ms): `scale(1.04)`, border to `#A8ECFF` (`#FFD08A`), outer glow 22 px at 60%. A `x` landing uses the spec's 1.0 → 1.1 → 1.0 pulse instead.
- The value counts in place; the label never moves.

### 5.12 CLEARS lamp (12 pt at 352,751 **[spec]**)

- Off: grey glass `radial(35% 30%, #6C727B, #3A4048 55%, #1D2126)`; a 1.5 pt `#3A2A10` bezel and a 1 pt brass ring.
- On: `radial(35% 30%, #E9FFEE, #9BF5B2 22%, #5BE37D 55%, #1F8A43)`, glows `0 0 10px 2px` at 75% and `0 0 22px 4px` at 35%. It switches on with a 60 ms flicker (on, 40% for 30 ms, on).
- An engraved `CLEARS` (7 pt, 0.12em) sits under it on the brass, so nobody has to guess what green means.

### 5.13 Flying numbers

- Mono 800, the box's `-hi` colour, a 3 pt stroke in the box's deep colour (`paint-order: stroke fill`), a 10 px glow.
- Staff flings carry a tapering trail along their arc: 17% of the path, width 0.8 → 5 pt, opacity `k²`, drawn twice (blurred 2.4 and sharp), with 4-5 sparks.

---

## 6. Icons (staff objects)

Every staff member is drawn as the object they keep. No faces, hands or figures.

- **Canvas:** 64 x 64 viewBox; live area 52 x 52 (6 units clear all round). Drawn at 34 pt on the rail, 48 pt on a Briefing card, 64 pt and up for store art.
- **Silhouette first.** Fill the whole object in black and check it at 20 px: if you cannot name it, redraw it. Objects lean or angle (lamp, telescope, map) rather than sitting square.
- **Outline:** 2.25 units, `#0B0D11`, round joins and caps, around every part (not between flat tones of the same part). Rods are drawn as an ink stroke 4.5 units wider than the material stroke on top.
- **Three flat tones per material** (no gradients): light on faces turned to the top-left, base, dark on faces turned to the bottom-right. At most two materials and one accent per object.
- **One highlight:** a single short stroke or ellipse in `rgba(255,252,240,.85)`, on the top-left of the main form.
- **Materials** (light / base / dark): brass `#F1D28A / #C9A35B / #8A6A2E`; gunmetal `#5B636E / #363C45 / #1F2329`; red bakelite `#F06A57 / #C93A2E / #82211B`; ivory `#F6F0E2 / #E2D8C2 / #B9AC8E`; paper `#F4EEDF / #DDD2B8 / #B3A585`; leather `#B97A43 / #8C5630 / #5A3418`; steel `#DFE5EC / #A5AEB9 / #66707C`; lens `#D6ECFF / #9DB8D9 / #56708F`.
- **Lit objects** (the Duty Officer's lamp) may add one soft radial glow in `--momentum` behind the light source; nothing else glows.
- On the felt the object gets `drop-shadow(1.5px 2px 1.5px rgba(0,0,0,.6))`; the icon itself has no shadow.

Shipped in `lib/icons.js`: desk lamp (Duty Officer), red telephone (Hotline Operator), ship's bell (Harbourmaster), folded map (Strategist), brass telescope (Admiral), leather satchel (Courier), morse key (Signals Officer), the Funds coin, and the stamps FORTIFY, RELAY, ECHO, CABLE and RECRUIT. The remaining staff follow the same rules: supply crate (wood: `#C68E52 / #9A6634 / #5E3B1C`, with brass corners), theodolite (brass on a gunmetal tripod), wax seal (red wax blob with a brass handle), cash box (gunmetal with a brass lock), tin mug (steel, with the count on a paper tag), timetable (paper booklet with red rules), teacup (ivory with a saucer), diplomatic bag (leather with a red wax seal), ferry timetable (folded paper with a blue band), clipboard (wood board, steel clip, paper), carbon paper (two sheets, the back one blue-black), paper crown (paper, cut zigzag), signet ring (gold, seen at three-quarters).

Orders are rubber stamps on linen, never objects: FORTIFY a star fort with hatching, RELAY a double ring, ECHO two overlapping heads (one solid), LAY CABLE an arc with two terminals, DEFECT an ink drop, PROMOTE a star, RETIRE a shutter (three bars), AIRLIFT a pin with wings drawn as two chevrons. Playbooks are linen with a stencilled pattern name and `+1 Lv`.

---

## 7. Motion

Timings are the spec's (section 9) and are not repeated here; this is how each move should feel. Curves (tokens): `--ease-out cubic-bezier(.22,1,.36,1)`, `--ease-in cubic-bezier(.55,0,1,.45)`, `--ease-in-out cubic-bezier(.65,0,.35,1)`, `--ease-back cubic-bezier(.34,1.56,.64,1)`, `--ease-flap-fall cubic-bezier(.5,0,.9,.4)`, `--ease-flap-land cubic-bezier(.2,1.35,.5,1)`.

- **Weight.** Things that are pressed or dropped accelerate in (`--ease-in`) and stop dead or bounce. Things that appear decelerate (`--ease-out`). Only stamps and landings overshoot (`--ease-back`). Nothing floats or eases both ways except the scan line's AGAIN snap-back (`--ease-in-out`, 80 ms).
- **The press.** SWEEP drops 3 pt in 120 ms on `--ease-in` and its skirt shrinks from 4 to 1 at the same time. It comes back up only when the slam ends.
- **The stamp** (pattern name, CLEARED): scale 1.4 → 1.0 (CLEARED 1.6 → 1.0) on `--ease-back`, with opacity 0 → 1 in the first 40%. CLEARED lands at -3 deg and does not rotate while scaling.
- **The hop.** 6 pt up in 50 ms (`--ease-out`), down in 70 ms (`--ease-in`), with a 1-frame squash (`scaleY .94`) on landing. The shadow on the leather stays put and fades to 60% at the top of the hop.
- **The fling.** Numbers fly on a quadratic arc whose control point bows away from the scan line (towards the screen edge), so trails never cross the scoring cluster. 200 ms on `--ease-in-out`; the number scales 1.0 → 1.15 at the apex → 0.9 on arrival, then the box bumps.
- **The rise** (`+w` from a pin): 18 pt straight up in the first 60 ms (`--ease-out`), then the fling to Influence.
- **The slam.** The two boxes slide 40 pt towards each other on `--ease-in` and stop on contact; on contact a 1-frame flash of `--heat` along the touching edges and both boxes squash to `scaleX .96`. Then the shake.
- **Shake.** Random offsets, decaying linearly to 0 over 250 ms **[spec]**, re-picked every 16 ms; the whole screen moves except the OS chrome.
- **The split-flap cascade.** See 5.2; the sound is one tick per flap, never one per number.
- **Heat** crossfades in 150 ms **[spec]** and holds until the slam; the backlight leaks brighten at the same moment.
- **Map flash, shockwave, brass drop, lights out:** as spec 9. The brass tack falls from 18 pt above with its shadow growing from 40% to full, then bounces 2 pt.
- **Reduced motion:** no shake, no flying numbers, no hop; values update in place with a 120 ms opacity cross-fade; the board digits change without flips; HEAT still changes colour.

---

## 8. Do and don't

**Do**
- Make every surface a material: steel, leather, felt, brass, linen, glass. If you cannot say what it is made of, it is a rectangle and it will look like a prototype.
- Light every edge from the top-left and cast every shadow down-right.
- Keep the numbers the brightest pixels on screen, in tabular Mono, with their colour meaning intact.
- Keep 16 pt side margins and the spec's rects exactly. Align text to the baseline grid of its row.
- Show physical state with physical cues: a pressed button is lower, a firing seat is higher, a used Order is gone from the tray.
- Draw `◆ ⚓ ★ → ●` as SVG. Test every screen at 390 x 844 on a real phone at 3x.
- Let the map breathe: names only on lit and pinned regions, weights on all.
- Keep the world legible during a sweep (dim, never black out).

**Don't**
- No pure white text, no pure black panels, no default browser blue, no system fonts, no emoji.
- No flat grey buttons, no 1 px grey borders around boxes, no generic drop shadows under text. Text gets an engraving highlight (on brass), a meaning-colour glow (live values) or a dark halo (on the map), nothing else.
- No gradients inside icons; no outlines thinner than 2 units; no photographic textures or raster images; no faces.
- No green felt, cards, chips or anything that reads as gambling.
- No glow on static labels. Glow is for live values only (section 2): at rest, only the two boxes, the CLEARS lamp and the board backlight glow.
- No text smaller than 7 pt; no text in the bloc colours on the bloc's own plate; no centred multi-line paragraphs.
- No debug UI: no outlines on hit areas, no raw IDs (`LNK`), no `undefined`/`NaN`/`0.30000000004`, no placeholder copy. Numbers over 9,999 get commas; from 1e6 use 10.6M / 10.6B (spec 12).
- No real places, people, flags or brands, anywhere.

---

## 9. What the frames add to the spec (for the lead to accept or strike)

1. **Briefing bottom row** (0,739-807 inside the tray, which the spec leaves empty): the two in-tray wells at the same x as in play (so Orders can be armed during the Briefing, which spec 6 allows), and a typed payout receipt (reward, unused sweeps, interest, overwhelm) at 238,745,136,56. Strike the receipt if unwanted; keep the wells.
2. **Offer card header:** rarity and timing (`RARE · PIN`) top-left and the seat chip the staff will wear top-right.
3. **Target in `--alarm`** on the Big Board: the design reserves red for the target, and this is where the target is.
4. **CLEARS label** engraved under the lamp.
5. **Cooled flashpoint ring** (`--standby`, 13 pt) left on the map after a clear.
6. **Coastline treatment** (rounded corners, fine chart edge) and **terrain isolines**: cosmetic, borders unchanged.

The frame's numbers are illustrative: the brief asked for `NETWORK Lv 2` with `312 x 12`. Under the spec's ladder a Lv 2 Network starts at 105 x 9 and nothing in the frame's seats adds Momentum during the pin events, so a build that shows the trace honestly will show different values at this moment. The look does not change.

## 10. Tooling

```sh
node docs/war/art/tools/map-data.mjs                  # after src/war/content/map.json changes
node docs/war/art/tools/render.mjs docs/war/art/style-frame.html docs/war/art/style-frame.png 390 844 3
node docs/war/art/tools/render.mjs docs/war/art/style-briefing.html docs/war/art/style-briefing.png 390 844 3
node docs/war/art/tools/render.mjs docs/war/art/style-sheet.html docs/war/art/style-sheet.png 1200 2860 2
```

Then `python3 tools/war-webp.py`: the repository keeps the WebP copies and ignores the PNGs.

The renderer uses the pre-installed Chromium at `/opt/pw-browsers/chromium` (override with `CHROMIUM_PATH`), waits for the page's `window.__ready`, and exits non-zero on any page error or failed request. The pages also open directly from disk in any browser.
