# Plan — PWA (GAP checklist item 5): installable + offline + push

> Status: **plan, awaiting 3 unblocks** (§4). Decided scope = **full** (offline +
> push). Split into two phases so each is independently shippable and verifiable
> in a browser (a PWA's install/offline/push behaviour can only be confirmed in
> a real browser — not in CI/type-check).

## Phase 1 — installable + offline shell

1. **`vite-plugin-pwa`** in `apps/app/vite.config.ts` (`registerType: "prompt"`
   so users opt into updates; `workbox` generateSW). Confirm the plugin version
   that supports **Vite 8** first (BLOCKER §4.1).
2. **Manifest** (`name`, `short_name: "Qarote"`, `theme_color`/`background_color`
   from `styles/index.css` tokens, `display: "standalone"`, `start_url: "/"`,
   `scope: "/"`) + icon set (BLOCKER §4.2).
3. **Service worker** — precache the app shell; runtime caching:
   - app shell / static assets → `StaleWhileRevalidate`,
   - tRPC/`/api/*` → **NetworkOnly** (never cache authed data),
   - navigation fallback → a hand-authored `apps/app/public/offline.html` shell,
     served from static assets and wired via the plugin's Workbox
     `navigateFallback: "/offline.html"` (the plugin does **not** auto-generate
     the page — we author it; Workbox just routes failed navigations to it).
     **Contents**: a tiny self-contained shell (target **< 5 KB**, all CSS
     inline, **no external asset deps** so it caches reliably on slow links) —
     brand logo, a calm "You're offline" message (per `DESIGN.md` voice), and a
     "Retry" button (`onclick="location.reload()"`). Semantic HTML + ARIA
     (`role="status"` on the message); inherits `theme-color` so it's not a
     jarring white flash in dark mode.
4. **Registration + update prompt** — a small `useRegisterSW` toast ("New
   version available — reload"). No silent auto-update (avoids mid-session
   surprises).
5. `index.html`: `<link rel="manifest">`, `apple-touch-icon`, `theme-color`.
6. **Verify in a browser — cross-browser**: Lighthouse "Installable" pass; per
   browser check SW registration + lifecycle, install/prompt behaviour, offline
   shell render (airplane mode), cache strategies, and that authed routes never
   serve stale data. Matrix: **Chrome, Edge, Firefox** (desktop + Android) and
   **Safari/iOS** — noting the known gaps (Safari/iOS has no `beforeinstallprompt`
   so install is the manual "Add to Home Screen", and SW scope/background limits
   differ). Record results in a **"Browser verification"** subsection of the PR
   description (under Testing), one line each:
   `Browser: <name>; Version: <semver/UA>; Result: Pass/Fail; Notes: <…>`.

## Phase 2 — web push

Notify on alerts even when the app/tab is closed.

1. **VAPID keypair** (BLOCKER §4.3) — `web-push generate-vapid-keys`; public key
   to `@/config` (client-readable), private key a server secret. New env vars go
   through the typed config first (per ai_rules).
2. **`PushSubscription` model** (Prisma migration, DB-less diff per the
   timescaledb workflow): `{ id, userId, endpoint @unique, p256dh, auth,
   createdAt }` + cleanup metadata `{ expirationTime?, lastSeenAt,
   consecutiveFailures @default(0) }`, `onDelete: Cascade` from User.
3. **Backend `push.service`** (`web-push` lib): `subscribe` / `unsubscribe`
   tRPC mutations. `DEFAULT_PUSH_TTL = 30 * 24 * 60 * 60 * 1000` (30 days, in
   `@/config`). On subscribe, **always persist** a non-null expiry —
   `expirationTime = subscription.expirationTime ?? Date.now() +
   DEFAULT_PUSH_TTL` (browsers often send `null`) — and refresh `lastSeenAt`, so
   the column is `expirationTime` (not `expirationTime?`) for any row this
   handler writes.
   `sendToUser(userId, payload)` prunes 404/410 immediately and, on any send
   failure, bumps `consecutiveFailures` (reset to 0 on success). **Proactive
   cleanup:** a periodic maintenance job (alongside the existing workers) drops
   subscriptions past `expirationTime` (defensively, for legacy/corrupted rows
   where it's somehow null, `lastSeenAt + DEFAULT_PUSH_TTL`) or above a
   configurable
   `consecutiveFailures` threshold (**default: 5**, per-deployment override) —
   so dead endpoints don't accumulate even if they never return a 410.
4. **Wire into the alert pipeline** — in `alert.notification.ts`, alongside the
   existing email/Slack/webhook channels, push to subscribed devices for a
   workspace's members (respecting the same severity gate + the ack/snooze
   suppression added in #221). Own per-channel cooldown stamp.
5. **Service worker `push` + `notificationclick`** handlers (extend the Phase 1
   SW) → show the notification, focus/deep-link the app to the alert.
6. **Frontend** — a Settings → Notifications "Enable push on this device"
   control: request permission,
   `PushManager.subscribe({ applicationServerKey, userVisibleOnly: true })` —
   `userVisibleOnly: true` is **required** (Chromium rejects the subscription
   without it), and `applicationServerKey` is the **VAPID public key from step
   1** (URL-base64 → `Uint8Array`). POST the subscription; reflect
   granted/denied/unsupported states.
7. **Verify in a browser**: subscribe, fire a test alert, confirm the OS
   notification with the tab closed; revoke permission → graceful unsubscribe.

## 3. Notes / guardrails

- **Never cache authed API responses** in the SW — `/api/*` is NetworkOnly.
- Push payloads carry **no secrets** and **no PII**. A push notification can
  surface on a lock screen / sync to other devices via the OS — treat it as
  public. **Allowed:** generic event type + severity + a short coded status
  (e.g. "High-severity config finding"), plus a **deep link** whose detail
  resolves only behind authenticated access. **Not allowed:** customer/org
  names, user identifiers, server/queue/host names, IPs, or broker credentials.
  The deep link addresses the finding/alert by its **internal id token**, never
  by a raw resource identifier.
- **VAPID-absent degradation must be handled in BOTH layers.** Backend:
  `push.service.subscribe` detects missing/invalid VAPID config and returns a
  clear unavailable response (`SERVICE_UNAVAILABLE` / `503`) instead of
  half-storing a subscription it can never send to. Frontend: the **subscribe
  control** reads a runtime flag (`window.APP_CONFIG.pushEnabled`, set from the
  public config) and hides itself when push is off — so a self-hosted instance
  without VAPID never shows a dead button. Alerts still email/Slack/webhook.

## 4. Blockers to unblock before building

1. **Vite 8 plugin compat** — confirm a `vite-plugin-pwa` version that supports
   Vite 8 (or pin the approach). I'll verify on install; flagging since Vite 8
   is new.
2. **Icon assets** — need **192×192 + 512×512 PNG + a maskable** variant
   (current assets are `new_icon.svg` + a small `favicon.png`). Either provide
   them or approve generating them from the SVG (I can script it, but the raster
   output should be eyeballed — it's brand).
3. **VAPID keypair** — a deploy secret. Generate once; private key into the
   server secret store (staging + prod + the self-hosted docs). Push can't ship
   without it.

Once §4 is cleared I'll build Phase 1, verify it in a browser, ship it, then do
Phase 2.
