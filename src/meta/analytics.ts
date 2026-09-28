/**
 * Cookie-free analytics. Off by default; enabled by VITE_ANALYTICS=plausible|cloudflare.
 * No cookies, no identifiers, no location. Events carry only gameplay facts.
 */
import { FEATURES } from '../config';
import { load, save } from './storage';

export type AnalyticsEvent =
  | 'run_start'
  | 'run_end'
  | 'share'
  | 'unlock_viewed'
  | 'unlock_completed'
  | 'daily_played';

let runsThisSession = 0;

export function countRun(): number {
  runsThisSession++;
  return runsThisSession;
}

const FIRST_RUN_KEY = 'brink.firstRunAt';

/**
 * Whole days since this device's first run (0 on the first day). An integer with
 * no identifier attached; it lets day-7 return be measured as a cohort without
 * tracking anyone. Stored locally only.
 */
export function daysSinceFirstRun(now = Date.now()): number {
  let first = load<number | null>(FIRST_RUN_KEY, null);
  if (!first || typeof first !== 'number') {
    first = now;
    save(FIRST_RUN_KEY, first);
  }
  return Math.max(0, Math.floor((now - first) / 86_400_000));
}

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}): void {
  if (FEATURES.analytics === 'off') return;
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
  try {
    if (FEATURES.analytics === 'plausible') {
      const domain = FEATURES.analyticsDomain || window.location.hostname;
      void fetch('https://plausible.io/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: event, url: window.location.origin + '/', domain, props }),
        keepalive: true,
      }).catch(() => {});
    } else if (FEATURES.analytics === 'cloudflare') {
      // Cloudflare Web Analytics is page-view based; custom events go to a Worker/Zaraz endpoint if configured.
      if (!FEATURES.analyticsToken) return;
      void fetch(FEATURES.analyticsToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, props, t: Date.now() }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* analytics must never break the game */
  }
}
