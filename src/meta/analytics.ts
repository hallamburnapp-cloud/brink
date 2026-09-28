/**
 * Cookie-free analytics. Off by default; enabled by VITE_ANALYTICS=plausible|cloudflare.
 * No cookies, no identifiers, no location. Events carry only gameplay facts.
 */
import { FEATURES } from '../config';

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
