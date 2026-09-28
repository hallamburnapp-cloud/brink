# Placeholder art

Everything the UI draws that is not text lives behind two lookup tables in
`manifest.ts`: `portraits` (speaker dossier portraits) and `icons` (piece
glyphs). Content files refer to art by id only (`art: hawk_general`), so
swapping a placeholder for a real illustration never touches content or UI code.

```ts
type ArtEntry = { kind: 'svg'; body: string } | { kind: 'url'; url: string };
```

## Rendering

```tsx
import { Portrait, PieceIcon } from '@/ui/art/Portrait';

<Portrait art={speaker.art} accent={speaker.accent} size={40} title={speaker.name} />
<PieceIcon art={piece.art} accent={piece.accent} size={20} />
```

- `accent` becomes `currentColor` inside the SVG. Pass the speaker's or piece's
  `accent` from content.
- `title` sets `aria-label` (or `alt` for URL art). Omit it when the image is
  purely decorative next to visible text; the element is then `aria-hidden`.
- `size` is in CSS px and sets both `width`/`height` attributes and inline style.
  Both components render a square.
- Extra classes go through `class`. Base classes `brink-portrait` and
  `brink-piece-icon` are always present for global styling (e.g. `border-radius`).

### Recommended sizes

| where                         | Portrait | PieceIcon |
| ----------------------------- | -------- | --------- |
| card speaker chip / log line  | 40       | 16–18     |
| card header                   | 56–72    | 20        |
| dossier / piece detail sheet  | 96–160   | 32–48     |

Portraits are designed to be recognisable at 40px; icons at 16–24px. Both are
vector, so any larger size stays crisp.

## Colour variables

Portrait bodies use three colours:

| token                          | default   | meaning                          |
| ------------------------------ | --------- | -------------------------------- |
| `currentColor`                 | `accent`  | accent: cap band, tie, pin, tint |
| `var(--art-paper, #ece7d8)`    | off-white | silhouette (skin/paper) fill     |
| `var(--art-ink, #0b1220)`      | deep navy | backdrop, hair, dark garments    |

Set `--art-paper` / `--art-ink` on any ancestor to retheme (for example a
sepia "declassified" mode, or lighter ink on a paper-coloured card).

Icons use only `currentColor` as a 2px monoline stroke (round caps and joins)
with occasional small filled dots. They inherit nothing else, so they sit
correctly on any background.

## Swapping in real art

1. Export the illustration as PNG or WebP (see sizes below) and drop it into
   `public/art/`, e.g. `public/art/portraits/hawk_general.webp`.
2. Change the manifest entry:

   ```ts
   hawk_general: { kind: 'url', url: '/art/portraits/hawk_general.webp' },
   ```

   If the app is deployed under a sub-path, prefix with `import.meta.env.BASE_URL`.
3. Nothing else changes: `Portrait`/`PieceIcon` render an `<img>` for `url`
   entries with the same `size`, `class` and `title` handling. The accent is
   still applied as `color` on the element, so a transparent-background raster
   can be tinted with CSS (`mix-blend-mode`, filters) if wanted.

Recommended export sizes:

- Portraits: square, 320×320 (renders at up to 160 CSS px on 2× displays).
  Keep a 3–4% transparent or navy margin so it matches the SVG dossier frame.
- Icons: square, 96×96, transparent background, single-colour strokes.

To ship new inline SVG instead, keep the conventions above: portraits are a
`body` string of child elements only (no `<svg>` wrapper) on a 0 0 100 100
viewBox, ~10–25 shapes, using `currentColor`, `var(--art-paper)` and
`var(--art-ink)`; icons are a `<g>` with the monoline attributes on a 0 0 48 48
viewBox. `manifest.test.ts` checks every required id exists and that bodies are
well-formed, so run `npx vitest run src/ui/art` after editing.

## Ids

Portraits (23): `aide`, `hawk_general`, `dove_fm`, `intel_director`,
`spin_doctor`, `ambassador`, `cyber_director`, `treasury`, `admiral`,
`peace_leader`, `contractor`, `fixer`, `hotline`, `watch_officer`, `press`,
`ally_leader`, `rival_leader`, `other_leader`, `opposition`, `family`,
`scientist`, `envoy`, `legal`. Unknown ids fall back to `aide`.

Icons (36): the eleven advisor ids above minus `aide`/`hotline` etc.
(`hawk_general` star, `dove_fm` dove, `intel_director` eye, `spin_doctor`
megaphone, `ambassador` quill, `cyber_director` dish, `treasury` coin,
`admiral` anchor, `peace_leader` olive branch, `contractor` gear, `fixer` key),
twelve `doctrine_*`, twelve `asset_*`, and `generic`. Unknown ids fall back to
`generic`.
