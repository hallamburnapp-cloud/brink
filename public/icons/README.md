# App icons

`icon.svg` is the master BRINK mark: a thin off-white ring on deep navy with a
red arc segment at the top right — a gauge one tick from full. It is drawn on a
512×512 canvas with the mark kept inside the central 80% circle, so the same
file is safe for `purpose: "any maskable"`.

`../favicon.svg` is the same mark on a 64×64 rounded tile for browser tabs.

## Rasters

The PWA manifest (see `vite.config.ts`) expects:

| file           | size    | purpose        |
| -------------- | ------- | -------------- |
| `icon-192.png` | 192×192 | any            |
| `icon-512.png` | 512×512 | any + maskable |
| `apple-touch-icon.png` | 180×180 | iOS home screen (also referenced from `index.html` as `icon-192.png` today) |

They are produced from `icon.svg` by a separate tool, not committed by hand.
To regenerate them locally with the `@resvg/resvg-js` dependency already in
`node_modules`:

```sh
node -e "
const { Resvg } = require('@resvg/resvg-js'); const fs = require('fs');
const svg = fs.readFileSync('public/icons/icon.svg');
for (const s of [180, 192, 512]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: s } }).render().asPng();
  fs.writeFileSync(s === 180 ? 'public/icons/apple-touch-icon.png' : `public/icons/icon-${s}.png`, png);
}"
```

`index.html` also points `apple-touch-icon` at `icon-192.png`.

## Swapping the mark

1. Replace `icon.svg` (keep the 512 viewBox, an opaque `#0b1220` background,
   and all shapes inside r ≤ 205 from the centre so masks do not clip it).
2. Replace `../favicon.svg` (64 viewBox; rounded corners are fine here because
   it is never masked).
3. Regenerate the PNGs as above and update `theme_color` in `vite.config.ts`
   if the background colour changed.
