# Sidebar & Navigation Redesign — Design Brief

**Status**: Ready for implementation
**Owner**: Brice
**Related**: ADR-002 (feature-gate composition), `messages-unified-ux.md`, `diagnosis-rules-sourcing.md`
**Context PRs merged**: #42, #44, #45, #46, #47

---

## 1. Feature Summary

Restructurer la navigation principale de `apps/app` pour repositionner Qarote comme **outil d'observabilité et de diagnostic RabbitMQ** plutôt que clone du Management UI. Mettre les killer features (Diagnosis, Messages, Alerts, Topology) au premier plan, garder les vues objets accessibles mais secondaires, et faire de la Home un point d'entrée orienté insights.

## 2. Primary User Action

À l'ouverture de l'app, l'utilisateur doit pouvoir répondre à **« est-ce que tout va bien — et sinon, où est-ce que je dois regarder ? »** en moins de 3 secondes, sans avoir à scanner une grille de métriques.

## 3. Design Direction

Aligné avec `.impeccable.md` : Linear/Resend warmth + Grafana seriousness. Sidebar **calme et hiérarchisée** par job-to-be-done, pas par objet. Numbers-as-sacred reste roi sur la Home. Mascot reste off-stage (sidebar = serious tool). Anti-references réaffirmées : pas d'AI-slop SaaS, pas de Java admin tool, pas de Datadog density overload.

Le redesign doit **signaler le pivot** : un utilisateur qui ouvre Qarote pour la première fois doit comprendre en 2 secondes que ce n'est pas le Management UI repackagé.

## 4. Layout Strategy

### Structure proposée

```text
┌─────────────────────────────────┐
│ [Logo] Qarote                   │
│ ┌─────────────────────────────┐ │
│ │ Server: AWS RabbitMQ [⚐]   │ │  ← ServerCapabilityBadge déjà présent
│ │ VHost: Default              │ │
│ └─────────────────────────────┘ │
│                                 │
│ OVERVIEW                        │
│   ◐ Home                        │  ← remplace "Dashboard"
│   ⚡ Diagnosis      [3]         │  ← #2, badge = dedup'd count
│   ⚑ Alerts         [1]         │  ← active count
│   ✉ Messages                    │  ← Spy + Replay unifiés
│   ⌘ Topology                    │  ← Qarote-original, PixelNetwork inchangé
│                                 │
│ BROWSE         [▾]              │  ← collapsible, expanded par défaut
│   Queues                        │
│   Exchanges                     │
│   Connections                   │
│   Channels                      │
│   Nodes                         │
│   Policies                      │
│   Virtual Hosts      (admin)    │
│   Users              (admin)    │
│   Definitions        (admin)    │
│                                 │
│ ─────────────                   │
│   ? Help                        │
│   ⚙ Settings                    │
│   [user]            [logout]    │
└─────────────────────────────────┘
```

### Décisions structurantes

- **Deux groupes nommés** : `OVERVIEW` (verbes / jobs) et `BROWSE` (noms / objets). Labels sobres, pas marketing.
- **« Home » remplace « Dashboard »** : éloigne sémantiquement du Management UI ; permet une page d'atterrissage mixte (incidents + santé + activité), pas un mur de métriques.
- **Topology dans OVERVIEW** : c'est un ajout Qarote, c'est une killer feature, pas un objet natif. Le ranger avec les Queues l'enterre.
- **Messages = Spy + Tracing** : un seul item, deux modes internes (Live free / Replay premium). L'utilisateur a un mental model unique. Backend déjà unifié (`messages.tap.*` + `messages.recording.*`).
- **BROWSE est repliable, expanded par défaut**, état persisté en localStorage par utilisateur (`qarote.sidebar.browse.expanded`). Pas de toggle global « Classic mode » — trop binaire.
- **Pas de badge plan/capability sur les items sidebar.** Avec ADR-002, le gating est multi-axes (Plan × License × Capability) ; un badge fixe mentirait dans 2 cas sur 3. On délègue à `<FeatureGate>` + `<FeatureGateCard>` à l'intérieur de chaque page.
- **Status badges autorisés** : Diagnosis (count dedup'd via `incident_diagnosis_records.supersededBy IS NULL`) et Alerts (active count). Ce sont des **signaux opérationnels**, pas des marqueurs de tier.
- **Footer inchangé** dans sa logique (Help · Settings · User) mais toujours visible, avec une séparation visuelle claire.

### Workspace switcher

**Reste dans le topbar** (déjà en place : `Brice's Org › Kano`). Ne pas le dupliquer dans le sidebar header.

### Home (`/`) — esprit

Remplace `Index.tsx`. Quatre zones, hiérarchie descendante :

1. **Status banner** — calme par défaut (« All quiet · 4 servers healthy »), s'amplifie en bandeau status si incident actif. Couleurs : neutral / amber / red selon agrégat des findings Diagnosis + alerts ACTIVE.
2. **Active concerns** — cartes qui réutilisent **directement** le vocabulaire de `<DiagnosisCard>` :
   - Severity color
   - `firstSeenAt` « Open since » (seuil 60s anti-bruit déjà en place)
   - « Why this diagnosis? » collapsible (Radix)
   - Citation link (allowlist domaines déjà validée API-side)
   - Feedback thumbs (PostHog `diagnosis_feedback`, déjà wiré)
   - `supersededBy` « Caused by: » footer pour les superseded en mode dépliable
   - Possible variante « compact » du composant existant
3. **Activity at a glance** — message rates et top queues. Numbers en Fragment Mono, large. Time range via `<HistoricalRangeSelector>` avec `maxRangeHours` dérivé de `useCurrentPlan().planFeatures.maxMetricsRetentionHours` (clamp + 30d ENT déjà gérés). C'est ici qu'on **garde** les utilisateurs Management UI : ils retrouvent les chiffres qu'ils cherchent.
4. **Pulse** — petit teaser Daily Digest (« Get this in your inbox each morning → ») qui linke vers `/settings/digest`. Doit rappeler le **workspace courant** (lu depuis `useWorkspace()`) puisque la config digest est par workspace.

## 5. Key States

| État | Sidebar | Home |
|---|---|---|
| **First run / no server** | OVERVIEW grisé, focus sur « Add server » CTA dans header | Empty state mascot + onboarding |
| **Healthy** | Pas de badges status | Status banner vert/calme, « Active concerns » vide ou minimal |
| **Warning** (1+ alert) | Badge nombre sur Alerts | Status banner amber, alertes en haut |
| **Critical** (incident détecté) | Badge nombre sur Diagnosis | Status banner rouge, incident en hero card avec next action |
| **Free user, premium feature** | Item visible sans badge | `<FeatureGate>` rend `preview` ou `blocked` → `<FeatureGateCard>` |
| **Capability missing** (ex. firehose absent) | Item visible sans badge | `<FeatureGate>` rend `degraded` → advisory banner |
| **BROWSE collapsed** | Section repliée, chevron, count des items | n/a |
| **Loading server data** | Sidebar items actifs mais status dot loading | Skeleton respectant la hiérarchie finale |

## 6. Interaction Model

- **Click sidebar item** → navigation classique React Router (déjà en place)
- **BROWSE chevron** → toggle expand/collapse, persiste en localStorage
- **Status badges** sur Alerts/Diagnosis → tooltip au hover (« 3 active incidents · click to view »)
- **Server/VHost selectors** → inchangés (déjà bons)
- **Mobile/narrow** : sidebar devient drawer (déjà géré par `ui/sidebar.tsx`)

## 7. Content Requirements

Strings à ajouter/modifier dans `sidebar.json` (en/fr/es/zh) :

- `sidebar:overview` — « Overview » / « Vue d'ensemble »
- `sidebar:browse` — « Browse » / « Explorer »
- `sidebar:home` (remplace `sidebar:dashboard`) — « Home » / « Accueil »
- `sidebar:messages` (remplace `sidebar:tracing`) — « Messages » (déjà fait)
- `sidebar:diagnosis` — « Diagnosis » / « Diagnostic »
- `sidebar:alerts` — « Alerts » / « Alertes »
- `sidebar:browseToggle.collapse` / `expand`

Empty/edge state copy (Home) : direct, sans cute, conforme principle 4 (mascot off-stage). Ex : « All quiet across your brokers. » pas « Nothing to worry about! 🐰ª».

## 8. Recommended References

- `spatial-design.md` — pour la Home (rythme, hiérarchie 4 zones)
- `interaction-design.md` — pour le toggle BROWSE
- Principes 1, 2, 3 de `.impeccable.md` (working memory, status loudness, numbers sacred) appliqués directement sur la Home

## 9. Améliorations opportunistes (non bloquantes)

À faire pendant la refonte si scope le permet, sinon report :

### `<ServerCapabilityBadge>` — lisibilité

1. **Trigger pill** — le badge est très discret. Reco : dot de couleur + glyph (vert = all ready, amber = ≥1 degraded, rouge = ≥1 critical missing). Détail per-feature reste dans le popover.
2. **Conflit sémantique avec status dot** — dans le dropdown serveur, status dot (santé connexion) ≠ capability badge. Reco : status dot à droite (constant), capability summary à gauche du nom, distinct visuellement (pas un dot). Tooltips explicites.
3. **Empty/error states** — quand serveur down (red dot), capabilities = `unknown`. Le badge doit afficher un état neutre/grisé, pas un faux « all ready ». Vérifier que `useCapabilities` distingue `unknown` vs `not-ready`.

## 10. Hors scope (suivis séparés)

- **Audit log dans la nav** — aujourd'hui mono-kind (capability recheck), pas le poids pour un item top-level. Issue séparée pour étendre + exposer.
- **Deep-link Diagnosis → Messages** — `/messages?mode=live&queue=...` depuis recommendations Diagnosis. Anticiper la query string dans le routing mais l'implémentation des CTAs vit dans une autre PR.
- **Audit log UI** — tracé dans une issue séparée.

## 11. Décisions tranchées (récap)

| Décision | Statut |
|---|---|
| Structure 2 sections (OVERVIEW + BROWSE) | ✅ figé |
| OVERVIEW order : Home → Diagnosis → Alerts → Messages → Topology | ✅ figé |
| Home remplace Dashboard, 4 zones | ✅ figé |
| BROWSE collapsible expanded par défaut, persisté localStorage | ✅ figé |
| Pas de badge plan/capability sur items sidebar (délégué à `<FeatureGate>`) | ✅ figé |
| Status badges Diagnosis (dedup'd) + Alerts (active) | ✅ figé |
| Workspace switcher reste topbar | ✅ confirmé |
| ServerCapabilityBadge déjà en place, améliorations opportunistes | 📝 noté |
| Audit log hors scope sidebar | ✅ tranché |
| Topology icon inchangée (`PixelNetwork`) | ✅ confirmé |
