/**
 * Steam integration surface for BRINK — a no-op stub.
 *
 * The web build never talks to Steam. The desktop build will, but only through a
 * native bridge: browser JavaScript cannot load the Steamworks SDK. Every method
 * here therefore does nothing and logs in development, so game code can call
 * `Steam.unlockAchievement('HELD_THE_LINE')` today without branching on platform.
 *
 * Wiring it up later (Tauri 2), two workable routes:
 *
 *  1. Rust-side, via the `steamworks` crate (recommended for Tauri):
 *     - add `steamworks = "0.11"` to src-tauri/Cargo.toml, init `steamworks::Client::init_app(APP_ID)`
 *       in `lib.rs` and store it in `app.manage(...)`;
 *     - expose `#[tauri::command] fn steam_unlock_achievement(name: String)` etc.;
 *     - replace the bodies below with `invoke('steam_unlock_achievement', { name })`
 *       from `@tauri-apps/api/core`, guarded by `isRunningOnSteam()`;
 *     - ship `steam_appid.txt` next to the binary for dev, and let Steam's launcher
 *       set SteamAppId in release.
 *
 *  2. Node sidecar with steamworks.js (https://github.com/ceifa/steamworks.js):
 *     - a tiny Node script (`pkg`/`node --experimental-sea`) that requires
 *       `steamworks.js`, calls `init(appId)` and reads JSON commands on stdin;
 *     - declare it under `bundle.externalBin` in tauri.conf.json and grant
 *       `shell:allow-spawn` for that sidecar in capabilities/default.json;
 *     - spawn it with `Command.sidecar('binaries/steam-bridge')` from
 *       `@tauri-apps/plugin-shell` and write `{ op: 'unlockAchievement', id }` lines.
 *     Heavier (bundles a Node runtime) but keeps all Steam code in TypeScript.
 *
 * Either way the public shape of `Steam` below stays the same.
 */

export type SteamAchievementId = string;

export interface SteamApi {
  /** Initialise with the Steam App ID. Resolves false when Steam is not available. */
  init(appId: number): Promise<boolean>;
  /** Set an achievement without the Steam overlay toast (same as unlock on Steam, kept for parity with other stores). */
  setAchievement(id: SteamAchievementId): Promise<boolean>;
  /** Unlock an achievement and show the overlay toast. */
  unlockAchievement(id: SteamAchievementId): Promise<boolean>;
  /** The player's persona name, or null when not running on Steam. */
  getPlayerName(): Promise<string | null>;
  /** True only inside a Steam-launched desktop build with a live client. */
  isRunningOnSteam(): boolean;
}

const DEV = typeof import.meta !== 'undefined' && Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);

const log = (...args: unknown[]) => {
  if (DEV) console.info('[steam:stub]', ...args);
};

let initialisedAppId: number | null = null;

export const Steam: SteamApi = {
  async init(appId) {
    initialisedAppId = appId;
    log(`init(${appId}) — no Steam client in this build`);
    return false;
  },
  async setAchievement(id) {
    log(`setAchievement(${id})`, initialisedAppId === null ? '(before init)' : '');
    return false;
  },
  async unlockAchievement(id) {
    log(`unlockAchievement(${id})`, initialisedAppId === null ? '(before init)' : '');
    return false;
  },
  async getPlayerName() {
    log('getPlayerName() → null');
    return null;
  },
  isRunningOnSteam() {
    return false;
  },
};

export default Steam;
