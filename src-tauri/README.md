# BRINK desktop (Tauri 2)

Minimal Tauri 2 shell around the Vite bundle. No plugins, no IPC commands: the
desktop build is the web build in a 430×860 window with everything unlocked.

## Prerequisites

- Rust stable (≥ 1.77.2) via rustup, plus the per-OS toolchain:
  <https://tauri.app/start/prerequisites/> (WebView2 on Windows, Xcode CLT on macOS,
  `webkit2gtk-4.1` + `libappindicator3` etc. on Linux).
- `npm i -D @tauri-apps/cli@^2` (kept out of `package.json` until the desktop build
  is scheduled, so web CI stays light).
- Icons: see `icons/README.md` (`tauri icon public/icons/icon.svg`).

## Commands

```bash
# development: runs `npm run dev` (devUrl http://localhost:5173) and opens the window
VITE_FLAVOUR=desktop VITE_ALL_UNLOCKED=1 VITE_PAYWALL=0 npx tauri dev

# release bundles for the current OS (runs `npm run build` first, then packs ../dist)
VITE_FLAVOUR=desktop VITE_ALL_UNLOCKED=1 VITE_PAYWALL=0 npx tauri build
```

`bundle.targets` is `all`, so `tauri build` emits every bundle its host can make:
`.msi` + `.exe` (NSIS) on Windows, `.app` + `.dmg` on macOS, `.deb`, `.rpm` and
`.AppImage` on Linux. Output lands in `src-tauri/target/release/bundle/`.

## Layout

| Path | Purpose |
|---|---|
| `tauri.conf.json` | product name, identifier `com.hallamburnapp.brink`, window, bundle |
| `capabilities/default.json` | `core:default` permissions for the `main` window |
| `src/main.rs`, `src/lib.rs` | entry point; `lib.rs` is shared with mobile targets |
| `build.rs` | `tauri_build::build()` (embeds config, icons, capabilities) |
| `Cargo.toml` | `tauri = "2"`, `tauri-build = "2"`; release profile tuned for size |

Steam: the game-side stub lives in `../tauri/steamworks-stub.ts`; the store asset
checklist in `../tauri/STORE_ASSETS_CHECKLIST.md`.
