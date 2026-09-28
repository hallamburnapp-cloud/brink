# THEME.md — the look and feel of BRINK

**Identity.** Dark, cold, precise. A national command centre at 3am: navy screens,
a single lamp on off-white briefing paper, a red that gets brighter the closer
the world gets to the edge.

## Tokens (`src/styles.css`, Tailwind v4 `@theme`)

| Token | Value | Use |
| --- | --- | --- |
| `--color-navy` | `#0b1220` | Page background, card backs |
| `--color-navy-2/3` | `#101a2e` / `#17233b` | Dark panels (`.paper-dark`) |
| `--color-paper` | `#ece7d8` | Briefing paper (cards, endings), primary text on navy |
| `--color-ink` / `--color-ink-2` | `#0b1220` / `#2a3347` | Text on paper |
| `--color-red` / `--color-red-2` | `#e03b3b` / `#b8352f` | Escalation, danger, flashpoints, the mark |
| `--color-amber` | `#e0a23b` | Warnings, mid-risk odds |
| `--color-green` | `#5cbf6f` | Good outcomes, safe odds |
| `--color-blue` | `#4f8fc9` | Hotline, low escalation, the Republic |
| `--color-mute` | `#7c8b9a` | Secondary mono text |

**`--danger`** (0–1, escalation/100) is set on `:root` by the store and drives: the
red radial wash at the top of the page, the vignette's red glow, and the flashpoint
pulse. Nothing else needs to know about escalation to feel it.

## Type

- **Serif** for speech and story: `Iowan Old Style, Palatino, Georgia, serif`. Card text 17px/1.45; ending names 30–36px semibold.
- **Monospace** for intel and system: `ui-monospace, SF Mono, Menlo`. Labels 9–11px, letter-spaced 0.14–0.3em, uppercase.
- No webfonts are loaded (performance, offline, no third-party requests).

## Textures (CSS only)

- `.bg-crt`: fixed scan-lines (3px repeating gradient, overlay blend) plus a heavy vignette; the vignette's inner red glow scales with `--danger`.
- `.paper`: layered repeating diagonal hairlines at 1–2% alpha over the paper colour for grain, a top-light gradient.
- `.paper-dark`: the same grain in negative on a navy gradient, 8% hairline border.
- `.stamp`: mono, boxed, rotated −2°, used for choice reveals and kind labels.

## Motion

| Moment | Treatment |
| --- | --- |
| Card enter | 420ms translate/scale/rotate ease-out (`.card-enter`); two ghost cards underneath |
| Drag | Pointer-driven translateX with resistance beyond 88px (35% past threshold), rotation 0.05°/px; choice stamps fade in with tilt |
| Commit | 320ms fly-out to ±720px with 18° rotation; then the next card enters |
| Meter reaction | Fill height eases with a back-out curve (overshoot) over 700ms; delta badge rises |
| Flashpoint | 650ms screen shake, red inset pulse (`.pulse-red`) while inside, drone in audio |
| Odds roll | Overlay; needle sweeps with a cubic ease and decaying wobble (1.3s; 2.4s slow-motion inside flashpoints with red pulse); HELD/FAILED then "Missed by 3%" |
| Nuclear ending | Shake, 0.9s pause, silence then one low note (audio), 1.5s before the ending screen |
| Leverage tally | Overlay after commit: base counts up in ticks (pitch rising per step), then each mult chip lands (`tally_mult`), then the escalation multiplier, then the total slams in. Duration scales with the result (short for tens, 1.4s for thousands); the slam sound and a screen shake scale with `log10(total)` (CSS var `--shake`) |
| Ante | The ante bar fills toward the target; when the target is smashed the total slams twice as hard with `ante_smash` (a rising sweep into a chord); a missed ante drops the HUD into red and plays `ante_miss` |
| Accident odds | Strip under the meters shows the roll ("Attribution error · 7%"); on commit the bus ducks (held breath, 0.6–2s scaled by escalation) before the result: `accident` (tritone squares then a boom) or `accident_clear` |
| Escalation ≥ 80 | Continuous pulse heartbeat (70 bpm at 80 rising to 150 at 99), the drone filter opens with intensity and the paper tints red; the tally sounds detune wider |
| Endless | Home and ending show the local best score; the act banner reads the endless act number and the curve label |
| Reduced motion | Honoured via `prefers-reduced-motion` and the Settings override (`[data-motion="reduce"]`): no shake, pulse, tilt rotation, sweep or overshoot; the tally still counts (numbers are information) but without shake |

All animation runs on `transform`/`opacity` for 60fps; the card sets `will-change: transform` and `touch-action: none`.

## Layout

Mobile-first single column, max width 480px, 16px gutters, safe-area padding. HUD:
seat/act label and seed on top, five meters with preview dots, hidden values in
words, timer bar, the card, two tap targets, then charges. Desktop shows the same
column on the textured backdrop.

## Portraits and icons

Speaker portraits are SVG silhouettes (`src/ui/art/manifest.ts`) drawn with `currentColor`
accent and `--art-paper` / `--art-ink` fills; piece icons are 2px monoline glyphs.
Both are swappable per id for PNG/WebP via `{ kind: 'url' }`.

## Copy

Tight and in-world. Buttons say what happens ("Pick up the phone as the President",
"Bury this card"), labels are mono uppercase, and nothing on screen explains a
mechanic that the preview dots already show.
