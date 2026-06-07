# Design V2 → codebase mapping

> Mapping features + CTAs du prototype Claude design (`~/Downloads/Qarote_new_design`)
> vers l'existant, pour les 3 apps. Produit par fan-out (4 agents : web,
> app-core, app-settings, portal), 2026-06-07.
>
> **Principe de migration** : le rendu Claude design = **spec visuelle**.
> On **ré-implémente dans le stack réel** (Tailwind 4 + tokens, shadcn/Radix,
> i18n, tRPC), on **n'importe PAS ses fichiers**. Légende : ✅ EXISTS (réutiliser/
> restyler) · 🔌 REWIRE (logique/mutation existe, l'UI se restructure) · 🆕 NEW ·
> ⏸ DEFERRED/CUT (le design le montre, on a décidé de le différer/couper).

## Big picture
**La grande majorité est du REWIRE/RESTYLE, pas du build.** Les fondations
existent partout (charts, topology, scan, Explain streaming, server forms,
settings ×12, selectors, portal licences, pages web). **Le vrai gap = la couche
agent/MCP** (entièrement neuve, vit sur la branche non-mergée
`feat/mcp-agent-surface`) + les **mutations de lifecycle alertes/findings**.

---

## 🆕 BACKLOG — le vrai travail neuf (cross-app, priorisé)

### Backend (mutations qui n'existent pas)
1. **Agent/MCP (le plus gros)** : mint clé agent, list clés + last-call telemetry,
   revoke (better-auth `apiKey`), + l'endpoint `/api/mcp`. → branche
   `feat/mcp-agent-surface` à vérifier/merger plutôt que repartir de zéro.
2. **Lifecycle alertes** : `acknowledgeAlert`/claim · `resolveAlert` ·
   `snoozeAlert` · `reopenAlert`. (Aujourd'hui les alertes s'auto-résolvent, zéro
   lifecycle manuel — `ee/routers/rabbitmq/alerts.ts`.)
3. **Config findings** : `resolve` · `dismiss(+reason)` (le scan router n'a que
   `getFindings`/`triggerScan`).
4. **Portal `license.regenerate`** : revoke l'ancienne clé + émettre un nouveau
   JWT. Aucun endpoint de rotation aujourd'hui.
5. **Diagnostic → push adapter** (modèle d'alerte unifié, Phase 1-2 du plan) :
   lier `Alert` métrique ↔ finding diagnostic ↔ Explain.
6. *Optionnels/à trancher* : org `delete`, org `slug` edit, SMTP OAuth2 mode,
   portal **seats** (reco : DROP en v1), members `resend invitation`.

### Frontend neuf (backend déjà OK ou pas requis)
7. **Cockpit AgentBlock** (invite non-câblé + statut câblé) + **AskYourAgent**
   carousel de prompts.
8. **Settings → Agent keys** (table + Mint modal + Reveal one-time + per-client
   MCP snippets + Revoke + endpoint banner). Réutilisé par le cockpit.
9. **⌘K palette globale** : le primitif `components/ui/command.tsx` existe mais
   **aucun câblage app-level + hotkey**.
10. **Landing "agent surface" section** (boucle 4 étapes + tool inventory free/
    paid + MCP client chips) — **n'existe PAS** (le brief disait à tort
    qu'`AgentSection` existe ; faux dans `apps/web`). + **hero agent-chat panel**
    (mock transcript) + **section self-hosted/MIT**.
11. **Features** : bloc MCP client chips. **Docs** : article "MCP integration" +
    groupe nav "Agent · MCP" (scaffolding docs réutilisable).
12. **Portal Billing page** + route `/billing` + nav tab — **le backend existe
    déjà** (`payment.billing.getBillingOverview` reachable, jamais rendu).
13. **Profile** : avatar upload · connected accounts (unlink) · active sessions/
    sign-out-everywhere · delete account (type-DELETE). Primitives better-auth OK,
    rien surfacé.
14. Rich drawers **AlertDetail / FindingDetail** (timeline, delivery log,
    threshold-vs-actual) · **re-detect-diff** panel (Edit Server) · portal
    download-key · theme toggle · cancelled-checkout screen.
15. **Cookies** : page standalone `/cookies` (aujourd'hui juste banner + footer
    re-open).

### ⚠️ Migration à NE PAS casser
16. **Activation firehose** vit dans `pages/Messages.tsx` (qu'on masque) →
    **doit migrer dans Edit Server** (`FirehoseSection` → mutation
    `trpc.messages.recording.setEnabled` existe). Sinon diagnostic dégradé.

### 🔌 RECONTENT web (le gros du web = copy monitoring → agent-first)
- **`landing.json hero.subtitle`** dit *"No agents, no Prometheus…"* → **contredit
  frontalement le pivot**. Priorité #1 copy.
- `FooterSection.tsx:271` tagline en dur `"RabbitMQ monitoring."` → réécrire.
- Hero, ConnectionSection (ajouter "wire your agent over MCP"), Comparison
  (ligne Agent/MCP), FAQ, Features/Pricing/Docs/Blog/About/Changelog : copy
  monitoring-framed dans les `locales/en/*.json` → agent-first.

## ⏸ DEFERRED / CUT — à masquer (hide, don't delete)
- **Éditeur de seuil alertes** : le design ship read+toggle (bon), mais le form
  create/edit de `AlertRulesModal` doit être **masqué au lancement** (YAGNI).
- **Digest builder** : coupé. `DigestSection` + `/settings/digest` à masquer ; le
  bloc "Custom digest" du notif-settings (le design l'omet déjà ✅).
- **Knob rétention trace par-workspace** : retiré (rétention uniforme 30j/7j).
- **Feedback section** : V1 mise de côté → masquer.
- ⚠️ **Roles/RBAC** : code entièrement build, mais **décision non finalisée**
  (re-rentre dans le scope comme SSO/Audit, ou reste différé ?). → à trancher.

---

## Statut par app (résumé)

### apps/web — quasi 100% RECONTENT
Pages/îlots existent pour ~tout (landing, pricing, features ×10 sous-pages,
compare ×4, docs, blog, about, changelog, quiz complet, legal islands). Gap =
**copy agent-first** + 6 vrais neufs : agent-surface section, hero chat panel,
self-hosted section, MCP client chips (features), MCP docs article, page cookies.
Tous les CTA "Try for free" → `trackSignUpClick` existant. *(Slug compare :
"Grafana" → `grafana-prometheus`.)*

### apps/app core — fondations fortes, agent layer neuf
✅ réutilisables : URL-first parser (`parseRabbitMQUrl`), AddServerForm, scan,
Explain streaming + quota + feedback + regenerate, `/explanations/:id`, charts,
topology + router, selectors, DiagnosisCard. 🆕 : tout l'AgentBlock/mint, le
lifecycle alertes (claim/resolve/snooze), resolve/dismiss findings, ⌘K global,
AskYourAgent. 🔌 : onboarding (recomposer en tunnel 3 étapes), ClusterDrawer
(consolider Connections/Channels/Nodes), Notifications (rename /alerts, rules en
tab), Edit Server FirehoseSection (migration critique).

### apps/app settings — surtout REWIRE, AI Explain/SSO/Audit/billing prêts
✅/🔌 réutilisables : AI Explain providers (`workspace.llm.*`), SSO (`sso.*`),
Audit (`audit.*`), Subscription/Plans/cancel (`payment.*`), Notification settings
(email/Slack/webhook), Alert rules read+toggle (`alerts.rules.updateRule`),
License self-hosted (`selfhostedLicense.*`), Roles (build complet). 🆕 : Agent
keys (entier), Profile extras (avatar/sessions/delete), org slug/delete/billing-
contact, density, SMTP OAuth2, cancel-reason.

### apps/portal — backend OK, gros deltas = regenerate + billing page
✅/🔌 : auth (login/signup/verify + Google + mutations), license card reveal/copy
+ tracking, empty/expired states, purchase tier-select → `purchaseLicense`
checkout, success banner via `?session_id`. 🆕 : **`license.regenerate`
(backend)**, **Billing page** (frontend sur backend existant), download-key,
theme toggle, expiring nudge, cancelled screen, manage/detail route, dialog
primitive manquant. **Reco : DROP seats** (pas de champ `License.seats`, gros
backend pour peu de valeur v1).

## Ordre de migration suggéré (par phases, par app)
1. **app shell + selectors + ⌘K** (la charpente).
2. **app cockpit** (+ AgentBlock 🆕 — dépend de la couche MCP backend).
3. **app auth/onboarding** (tunnel 3 étapes + Edit Server firehose).
4. **app settings + billing** (surtout rewire ; Agent keys 🆕).
5. **app bloc F** (drawers, skeletons, broker-disconnected, ⌘K complet).
6. **web** (recontent agent-first + agent-surface section).
7. **portal** (restyle + Billing page + regenerate).

> Dépendance dure : l'**AgentBlock cockpit** et **Settings → Agent keys**
> dépendent de la **couche MCP backend** (`feat/mcp-agent-surface`). À
> vérifier/merger en premier, sinon ces surfaces restent mockées.
