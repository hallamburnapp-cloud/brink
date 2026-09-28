/**
 * Single source of truth for brand and feature flags.
 * Keep the product name here only; everything else reads BRAND.name.
 */
export const BRAND = {
  name: 'BRINK',
  tagline: "It's 3am. The phone is ringing. Every choice might be the one that ends the world.",
  copyright: '© Hallam Burnapp. All rights reserved.',
  url: (import.meta as any).env?.VITE_PUBLIC_URL ?? 'https://brink.example',
  supportEmail: (import.meta as any).env?.VITE_SUPPORT_EMAIL ?? '',
} as const;

const env = (import.meta as any).env ?? {};
const bool = (v: unknown, d = false) => (v === undefined ? d : String(v) === 'true' || String(v) === '1');

export const FEATURES = {
  /** When false, ENDLESS is free (itch.io / desktop builds). */
  paywall: bool(env.VITE_PAYWALL, false),
  /** Stripe Payment Link URL for the one-time purchase. */
  stripePaymentLink: (env.VITE_STRIPE_PAYMENT_LINK as string) ?? '',
  /** Cloudflare Worker base URL for unlock tokens and purchase restore. */
  unlockWorkerUrl: (env.VITE_UNLOCK_WORKER_URL as string) ?? '',
  /** Public key (base64url-encoded P-256 JWK) used to verify unlock tokens client-side. */
  unlockPublicKey: (env.VITE_UNLOCK_PUBLIC_KEY as string) ?? '',
  /** Cookie-free analytics: 'off' | 'plausible' | 'cloudflare'. */
  analytics: ((env.VITE_ANALYTICS as string) ?? 'off') as 'off' | 'plausible' | 'cloudflare',
  analyticsDomain: (env.VITE_ANALYTICS_DOMAIN as string) ?? '',
  analyticsToken: (env.VITE_ANALYTICS_TOKEN as string) ?? '',
  /** Build flavour: 'web' | 'itch' | 'desktop' | 'mobile'. */
  flavour: ((env.VITE_FLAVOUR as string) ?? 'web') as 'web' | 'itch' | 'desktop' | 'mobile',
  /** Everything unlocked (itch.io zip and desktop builds). */
  allUnlocked: bool(env.VITE_ALL_UNLOCKED, false),
} as const;

export const VERSION = (env.VITE_APP_VERSION as string) ?? '0.1.0';
