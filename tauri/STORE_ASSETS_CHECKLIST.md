# BRINK — store assets & release checklist

Everything a Steam page, an itch.io page and the desktop builds need, with exact
pixel sizes. Master art lives in `public/` (mark) and the design files; exports go
in `tauri/store-assets/` (not committed until final).

Brand constants: navy `#0b1220`, off-white `#e8e4d8`, red `#e03b3b`, seat accents
`#4f8fc9` / `#c43a3a` / `#c98a3a`. Wordmark: bold serif, tracking +14.

## 1. Steam store page (Steamworks → Store Presence → Graphical Assets)

Store graphics — the game logo must be readable at the smallest size; Valve rejects
capsules that carry review quotes, awards or text other than the title/subtitle.

| Asset | Size (px) | Format | Notes |
|---|---|---|---|
| Header capsule | **920 × 430** | PNG/JPG | Store page top, search results, wishlist. Logo centred. |
| Small capsule | **462 × 174** | PNG/JPG | Lists, top sellers, recommendation rows. Logo must fill most of the width. |
| Main capsule | **1232 × 706** | PNG/JPG | Front-page featured / big spotlight. |
| Vertical capsule | **748 × 896** | PNG/JPG | Sales pages, mobile. |
| Page background | **1438 × 810** | JPG | Behind the store page; fades to Steam dark. Keep it quiet (scanline navy). |
| Screenshots | **1920 × 1080** ×5–10 | PNG/JPG | Minimum 5 (Valve requires ≥5 to publish), no UI mock-ups, no marketing text. Show: a crisis card, the escalation gauge near red, a flashpoint roll, the Daily results share card, an ending. |
| Trailer | **1920 × 1080**, H.264 MP4, AAC audio, ≤ 5 min | MP4 | 30 fps or 60 fps; upload the highest bitrate you have (Valve re-encodes). Plus a 1920×1080 thumbnail. |
| Bundle/DLC assets | — | — | Not needed for v1. |

Library assets (shown in the user's Steam library, must be provided or the page shows placeholders):

| Asset | Size (px) | Format | Notes |
|---|---|---|---|
| Library capsule | **600 × 900** | PNG/JPG | Vertical "box art". Logo in top 60%. |
| Library hero | **3840 × 1240** | PNG/JPG | Full-width banner at the top of the library detail page. Keep the safe area 2560×1240 centred; the logo is composited on top so leave the centre clear. |
| Library logo | **1280 × 720** | PNG (transparent) | The wordmark alone, no background; positioned over the hero. |
| Library header | **920 × 430** | PNG/JPG | Usually the header capsule. |

Community & client:

| Asset | Size (px) | Format | Notes |
|---|---|---|---|
| Community icon | **184 × 184** | JPG | Community hub avatar. The mark on navy. |
| Client icon | **32 × 32** | `.ico` (Windows) / `.icns` (macOS) | Set under Steamworks → Installation → Client icon. Reuse `src-tauri/icons/icon.ico` / `icon.icns`. |
| Event / news images | 800 × 450 (cover), 1920 × 622 (spotlight) | PNG/JPG | Optional, for launch announcement. |

Copy blocks to prepare in Steamworks: short description (≤ 300 chars), about-this-game
(HTML/BBCode), system requirements per OS, mature content survey, tags (up to 20:
Strategy, Card Game, Roguelike Deckbuilder, Political Sim, Text-Based, Singleplayer,
Difficult, Replay Value…), languages, price tiers, and a support email/URL.

## 2. itch.io page (Dashboard → Edit game)

| Asset | Size (px) | Notes |
|---|---|---|
| Cover image | **630 × 500** (min 315×250) | Shown on browse/search. Same composition as the Steam small capsule. |
| Screenshots | any, **1920 × 1080** recommended, 3–5 | Stored under "Screenshots"; the first is the page hero. |
| Banner | 960 × 400 (optional) | For custom page theme. |
| Trailer | YouTube/Vimeo link | Reuse the Steam trailer. |
| Embed viewport | **430 × 860** portrait or "Mobile friendly" + fullscreen button | Must match the game's min size (360×640). Tick "Automatically start on page load" off; enable SharedArrayBuffer only if ever needed (it is not). |
| Upload | `dist-itch/brink-itch.zip` from `npm run build:itch` | Kind: HTML. `index.html` is at the archive root; base is `./` so it runs from itch's sub-path. Size limit 1 GB (ours is a few MB). |

Page copy: tagline, description (Markdown), tags, classification (Game → Strategy),
pricing (free or paid with "everything unlocked" note), release status, community
(comments) on.

## 3. Build & upload checklist

### Web (Cloudflare Pages / static host)
- [ ] `npm run build` → `dist/` (runs content validation and `npm run og`, which also writes icons).
- [ ] `npm run size` under the 250 KB gzip initial-JS budget.
- [ ] `VITE_PAYWALL`, `VITE_STRIPE_PAYMENT_LINK`, `VITE_UNLOCK_WORKER_URL`, `VITE_UNLOCK_PUBLIC_KEY`, `VITE_PUBLIC_URL` set in the host's env.
- [ ] `og-image.png` rebuilt daily (schedule a daily deploy or run `npm run og` in a cron worker) so link previews show today's Daily.

### itch.io
- [ ] `npm run build:itch` (sets `VITE_FLAVOUR=itch VITE_ALL_UNLOCKED=1 VITE_PAYWALL=0`, base `./`).
- [ ] Upload `dist-itch/brink-itch.zip` via the dashboard, or with butler:
      `butler push dist-itch/brink-itch.zip hallamburnapp/brink:html --userversion $(node -p "require('./package.json').version")`.
- [ ] Set embed size 430×860, mobile friendly, fullscreen button; test in an incognito window.

### Desktop (Tauri 2) — one runner per OS
- [ ] Icons generated: `npx @tauri-apps/cli@^2 icon public/icons/icon.svg -o src-tauri/icons`.
- [ ] `VITE_FLAVOUR=desktop VITE_ALL_UNLOCKED=1 VITE_PAYWALL=0 npx tauri build` on each OS; bundles in `src-tauri/target/release/bundle/`:
  - Windows: `msi/BRINK_x.y.z_x64_en-US.msi`, `nsis/BRINK_x.y.z_x64-setup.exe`
  - macOS: `macos/BRINK.app`, `dmg/BRINK_x.y.z_aarch64.dmg` (build `--target universal-apple-darwin` for one binary)
  - Linux: `deb/brink_x.y.z_amd64.deb`, `rpm/brink-x.y.z-1.x86_64.rpm`, `appimage/brink_x.y.z_amd64.AppImage`
- [ ] Smoke-test each bundle on a clean VM (WebView2 bootstrapper on Windows is embedded by config).

### Code signing
- **Windows**: an OV/EV Authenticode certificate (or Azure Trusted Signing). Configure
  `bundle.windows.certificateThumbprint`, `digestAlgorithm: "sha256"`, `timestampUrl`
  in `tauri.conf.json`; unsigned installers trip SmartScreen. Steam does not require
  signing but Windows users will see warnings without it.
- **macOS**: Apple Developer ID Application certificate; set `APPLE_CERTIFICATE`,
  `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`
  (app-specific), `APPLE_TEAM_ID` in CI so `tauri build` signs **and notarises**.
  Without notarisation Gatekeeper blocks the .app/.dmg outside Steam.
- **Linux**: no signing needed for .deb/.AppImage; optionally GPG-sign the AppImage
  and publish the `.sig`.
- **Tauri updater**: not used (Steam and the stores handle updates); leave
  `plugins.updater` out.

### Steam upload (SteamPipe)
- [ ] Steamworks → App Admin → Installation → General: launch options per OS
      (`BRINK.exe`, `BRINK.app`, `brink` AppImage/binary), client icon.
- [ ] Depots: one per OS (`win64`, `macos`, `linux64`) plus an optional shared content depot.
- [ ] Write `scripts/app_build_<appid>.vdf` with `"AppID"`, `"Desc"`, `"ContentRoot"`,
      `"BuildOutput"`, and one `depot_build_<depotid>.vdf` per OS pointing at the
      unpacked bundle folder (not the installer: upload the `.app` contents / the
      extracted NSIS payload / the AppImage or plain binary).
- [ ] `steamcmd +login <builder-account> +run_app_build scripts/app_build_<appid>.vdf +quit`
      (use a dedicated builder account with a Steam Guard code cached on the CI machine).
- [ ] Steamworks → Builds: set the new build live on the `default` branch (or a
      password-protected `beta` branch first).
- [ ] Achievements defined under Stats & Achievements with 64×64 locked/unlocked icons
      (JPG/PNG), ids matching `tauri/steamworks-stub.ts` calls.
- [ ] Store page: all assets above uploaded, "Review" requested at least 2 weeks
      before the launch date; "Coming Soon" page live for wishlists.
- [ ] Pricing, regions, release date set; the "Release" button is manual.

### Mobile groundwork (v2, untested)
- `capacitor.config.ts` at the repo root; `npx cap add ios` / `npx cap add android`
  after `npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`.
- App Store: 1024×1024 icon (no alpha), 6.7" (1290×2796) and 6.5" (1284×2778)
  screenshots; Play: 512×512 icon, 1024×500 feature graphic, phone screenshots
  ≥ 1080 wide.
