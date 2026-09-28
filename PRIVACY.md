# PRIVACY.md

BRINK is a single-player game with no accounts, no chat, no comments, no leaderboards
with names, no user-generated content and no user-to-user features of any kind.
These are product constraints, not just policy: nothing in the code base can send one
player's data to another player, and nothing will be added that does.

## Data on the device

Progress is stored in the browser's local storage under keys prefixed `brink.`:
unlocks, statistics, the endings compendium, the run in progress, settings, the
daily record and (if Endless was purchased) a signed purchase token. Nothing is
transmitted. Every storage access is wrapped in `try/catch`; when storage is
unavailable (private mode, blocked) the game runs with in-memory state.

## Cookies

None. The only client-side storage is the strictly necessary local storage above.

## Analytics

Off by default (`VITE_ANALYTICS=off`). When enabled, events are sent to a cookie-free
provider (Plausible or a Cloudflare endpoint) with no identifiers, no IP-based
location and no fingerprinting. Events and their properties:

| Event | Properties |
| --- | --- |
| `run_start` | seat, mode, difficulty, runs_this_session, days_since_first_run |
| `run_end` | ending, kind, days, act, seat, pieces, runs_this_session, mode |
| `share` | method (shared/copied/downloaded/text), ending |
| `unlock_viewed` | — |
| `unlock_completed` | — |
| `daily_played` | number, days_since_first_run |

`days_since_first_run` is a whole number of days since the first run on that device,
computed from a timestamp kept in local storage. It carries no identifier; it allows
"day-7 return" to be measured as a cohort proportion without tracking any individual.

## Payments

Handled entirely by Stripe (Checkout Payment Link). We never receive card details.
The unlock Worker receives the Stripe checkout session id and reads the purchaser's
email from Stripe to issue a token; it stores a SHA-256 hash of the email against the
issuance record so "restore purchase" works. No other personal data is processed.

## Location

Never requested, never inferred.

## Children and content

All content is fictional; no real persons, states or events. The game contains
depictions of geopolitical crisis and nuclear war in text.

## Contact

Support contact is published on the store page and set via `VITE_SUPPORT_EMAIL`.

## In-game page

The same information is shown at `/privacy` inside the game (`src/ui/screens/Privacy.tsx`).
