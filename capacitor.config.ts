/**
 * Capacitor 6 configuration for BRINK on iOS/Android.
 *
 * STATUS: untested v2 groundwork. No Capacitor packages are installed and no native
 * projects exist yet; this file only fixes the decisions so the mobile build starts
 * from the same identifiers as the desktop one.
 *
 * To bring it up:
 *
 *   npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
 *   npm i @capacitor/splash-screen @capacitor/status-bar
 *   VITE_FLAVOUR=mobile npm run build          # produces dist/ (webDir)
 *   npx cap add ios                            # creates ios/ (needs Xcode)
 *   npx cap add android                        # creates android/ (needs Android Studio)
 *   npx cap sync                               # copies dist/ + plugins into both
 *   npx cap open ios | npx cap open android    # build/run from the IDE
 *
 * Once @capacitor/cli is installed, replace the inline interface below with
 *   import type { CapacitorConfig } from '@capacitor/cli';
 * The inline type mirrors the subset of Capacitor's config this file uses so the
 * repository type-checks without the dependency.
 *
 * Mobile-specific notes for later:
 *  - The PWA manifest's `start_url: '/'` and the service worker are harmless inside
 *    the Capacitor WebView, but consider `VITE_FLAVOUR=mobile` disabling registration.
 *  - Paywall: stores require in-app purchase for digital unlocks; the Stripe link used
 *    on the web must not be reachable from the store builds (ship VITE_PAYWALL=0 with
 *    VITE_ALL_UNLOCKED=1 as a paid app, or add StoreKit/Play Billing).
 *  - `androidScheme: 'https'` keeps localStorage/IndexedDB on a secure origin, which
 *    is what the web build's save data and unlock tokens expect.
 */

interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  loggingBehavior?: 'none' | 'debug' | 'production';
  backgroundColor?: string;
  server?: {
    androidScheme?: 'http' | 'https';
    iosScheme?: string;
    hostname?: string;
    cleartext?: boolean;
  };
  ios?: {
    contentInset?: 'automatic' | 'scrollableAxes' | 'never' | 'always';
    scrollEnabled?: boolean;
    backgroundColor?: string;
  };
  android?: {
    allowMixedContent?: boolean;
    backgroundColor?: string;
    webContentsDebuggingEnabled?: boolean;
  };
  plugins?: {
    SplashScreen?: {
      backgroundColor?: string;
      launchAutoHide?: boolean;
      launchShowDuration?: number;
      launchFadeOutDuration?: number;
      showSpinner?: boolean;
      androidScaleType?: 'CENTER' | 'CENTER_CROP' | 'CENTER_INSIDE' | 'FIT_CENTER' | 'FIT_END' | 'FIT_START' | 'FIT_XY' | 'MATRIX';
      splashFullScreen?: boolean;
      splashImmersive?: boolean;
    };
    StatusBar?: {
      style?: 'DARK' | 'LIGHT' | 'DEFAULT';
      backgroundColor?: string;
      overlaysWebView?: boolean;
    };
    [plugin: string]: Record<string, unknown> | undefined;
  };
}

const NAVY = '#0b1220';

const config: CapacitorConfig = {
  appId: 'com.hallamburnapp.brink',
  appName: 'BRINK',
  webDir: 'dist',
  backgroundColor: NAVY,
  loggingBehavior: 'production',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: NAVY,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: NAVY,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: NAVY,
      launchAutoHide: true,
      launchShowDuration: 0,
      launchFadeOutDuration: 200,
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: NAVY,
      overlaysWebView: false,
    },
  },
};

export default config;
