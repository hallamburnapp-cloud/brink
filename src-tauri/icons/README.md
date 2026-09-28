# src-tauri/icons

Tauri bundles need platform icons in this folder. They are **not committed** as
generated output yet; produce them from the master mark with one command:

```bash
# from the repository root (Tauri 2 CLI accepts an SVG or a 1024×1024 PNG)
npx @tauri-apps/cli@^2 icon public/icons/icon.svg -o src-tauri/icons
# or, once @tauri-apps/cli is a devDependency:
npm run tauri icon public/icons/icon.svg
```

`tauri icon` writes every file `tauri.conf.json` → `bundle.icon` references, plus the
mobile and Windows Store sets:

| File | Size | Used by |
|---|---|---|
| `32x32.png` | 32×32 | Windows taskbar / Linux |
| `128x128.png` | 128×128 | Linux, macOS |
| `128x128@2x.png` | 256×256 | macOS Retina |
| `icon.icns` | 16→1024 multi-res | macOS app bundle |
| `icon.ico` | 16/24/32/48/64/256 | Windows exe, installer |
| `icon.png` | 512×512 (or 1024) | fallback / Linux desktop |
| `Square30x30Logo.png` … `Square310x310Logo.png`, `StoreLogo.png` | as named | Windows (MSIX / Store) |
| `android/mipmap-*/ic_launcher*.png` | mdpi→xxxhdpi | Android (Tauri mobile) |
| `ios/AppIcon-*.png` | 20→1024 @1x/2x/3x | iOS (Tauri mobile) |

Notes

- The source must be square. A **1024×1024 PNG with no transparency** is the safest
  input for `.icns`/`.ico`; SVG input is rasterised by the CLI.
- macOS masks the icon into its rounded-rectangle shape; keep the mark inside the
  central ~80% (the same safe zone as the PWA `maskable` icon).
- Regenerate whenever `public/icons/icon.svg` changes; the files here are derived.
