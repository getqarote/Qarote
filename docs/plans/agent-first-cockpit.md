# Agent-First Cockpit — draft IA & workflows

> Statut : **draft de discussion**, pas un plan d'implémentation. Objectif :
> matérialiser le principe "la Home devient le cockpit de l'agent" en
> wireframes + workflows, pour réagir dessus avant de toucher au code.

## Règle de design

> **Si l'agent sait le faire via MCP, l'UI ne le met pas en avant — elle le
> _vérifie_. L'UI ne mène qu'avec ce que l'agent ne peut pas faire pour
> lui-même : se brancher, te biper, dessiner la carte.**

Tri du produit selon cette règle :

| L'agent fait déjà (MCP) | → dans l'UI | L'agent NE peut pas | → first-class humain |
|---|---|---|---|
| `list_queues`, `get_overview` | lecture / vérification | se câbler tout seul | **bootstrap** (au signup) |
| `list_incidents`, `get_incident` | findings affichés | te biper quand personne ne demande | **Notifications** (push) |
| `explain_incident` (EE) | RCA rendu, deep-link | dessiner la topologie | **Topology** (carte) |
| `list_config_findings` | scan affiché | — | — |

## Deux décalages majeurs (contraintes Brice)

1. **Le 1er serveur s'ajoute au signup, avec un scan d'onboarding.** Donc le
   "connecte un serveur" ne vit PAS dans la Home — il est dans le tunnel de
   signup. Quand l'utilisateur arrive sur le cockpit, il a déjà un serveur
   **et** des résultats de scan. Le scan config est point-in-time (pas de
   warm-up 180 min) → **c'est lui la valeur à froid** qui tue les pièces
   vides, et il arrive avant le cockpit.
2. **Le flow MCP est universel ; `explain_incident` aussi.** Le mode ne change
   que le *provider LLM zéro-config*.
   - **Câbler son propre agent (Claude Code, Cursor, Copilot…) via MCP est
     first-class pour TOUT LE MONDE** — cloud comme self-hosted. C'est le
     cœur de l'interaction agent-first : tu bosses depuis ton éditeur.
   - **`explain_incident` (AI Explain) est une feature des deux modes**, gatée
     par **plan** (`features.ts:41`), pas par déploiement. Providers LLM
     (`enum LlmProvider`) : `MANAGED` · `ANTHROPIC` · `OPENAI` · `OLLAMA`.
     - `MANAGED` (clé de Qarote, zéro config) = **cloud only**, Enterprise.
     - `ANTHROPIC`/`OPENAI` (BYOK) = **partout**, Developer+.
     - `OLLAMA` (LLM local, 100% offline) = **partout**, Developer+ — c'est
       lui qui rend l'explain self-hosted sans aucun phone-home.
   - **Cloud** : bonus = l'agent **managé** tourne par défaut (provider
     `MANAGED`), surveille 24/7, auto-RCA zéro-config.
   - **Self-hosted** : même feature, via Ollama (local) ou BYOK clé. Demande
     juste de pointer un provider une fois.

## Nav : avant / après

```
AVANT (14 destinations)              APRÈS (3 + ⌘K)
─────────────────────────            ─────────────────────────
OVERVIEW                             ─
  Home                               🏠 Home        ← cockpit agent
  Incident Diagnosis                 🔔 Notifications
  Notifications                      🕸  Topology
  Messages (déjà masqué)             ─
  Topology                           ⌘K  (tout le reste)
BROWSE ▸ (replié, 9 items)           ─
  Queues … Definitions               Settings (clés agent, admin:
                                       vhosts/users/policies/definitions)
```

Browse n'est pas *déplacé*, il est **dissous** :
- **Queues / Exchanges** → déjà atteignables via Topology (clic nœud →
  `/queues/:name`, `Topology.tsx:137`). Zéro entrée de menu.
- **Connections / Channels / Nodes** → bloc "Cluster" dans la Home.
- **Policies / VHosts / Users / Definitions** → admin, près de Settings.
- Filet de sécurité : **⌘K** (primitif `components/ui/command.tsx` déjà là).

---

## Signup → onboarding (hors Home)

```
┌─────────────────────────────────────────────────────────────────┐
│  ① Create account ─→ ② Connect your first RabbitMQ ─→ ③ Scan     │
│                                                                   │
│     ┌─ ② Connect ────────────┐   ┌─ ③ Onboarding scan ─────────┐ │
│     │  host / port / creds    │ → │  ⟳ Scanning your broker…    │ │
│     │  [ Connect & scan → ]   │   │  ✓ 14 queues · 6 exchanges  │ │
│     │  (AddServerForm)        │   │  ⚠ 3 findings already:      │ │
│     │                         │   │    • no DLX on orders.*     │ │
│     │                         │   │    • no-consumer-queue idle │ │
│     │                         │   │    • default exchange abuse │ │
│     │                         │   │  [ Enter Qarote → ]         │ │
│     └─────────────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
        Valeur à froid : findings réels en quelques secondes,
        AVANT le cockpit. Pas de "warming up, reviens dans 180 min".
```

---

## La Home cockpit : une page, pilotée par l'état (pas par le mode)

Le serveur est **toujours** branché en arrivant (signup). Le cockpit n'est
**jamais bloqué/vide** : le scan d'onboarding + l'état live le remplissent,
même avant que tu câbles ton agent. Le mode n'est PAS une branche d'état —
c'est juste **une ligne en plus** (l'agent managé, cloud only).

```
  signup + scan ─→ Home cockpit (toujours vivant)
                     ├─ bloc YOUR AGENT : non-câblé (invite) │ câblé (statut)
                     │     + (cloud) ligne "Qarote agent watching 24/7"
                     └─ bloc WHAT YOUR AGENT SEES : calme (C) │ finding (D)
```

| Sous-état | Quand | Rendu |
|---|---|---|
| agent **non câblé** | personne n'a encore branché son agent | invite `Connect your agent` — jamais bloquant |
| agent **câblé** | ≥1 agent MCP branché | statut `✓ … connected` |
| **C** calme | aucun finding actif | `● All quiet` + état live |
| **D** finding | finding actif | `⚠` + `Explain root cause` |

### Bloc "YOUR AGENT" — le flow MCP est universel, partout

```
NON CÂBLÉ (n'importe qui — cloud ou self-hosted) ────────────────┐
│  ○ Connect your agent                                           │
│    Wire Claude Code, Cursor, Copilot… — it lists queues,       │
│    diagnoses incidents, explains root causes, in your editor. │
│    [ Connect your agent → ]   (AgentKeyRevealDialog)          │
│                                                                 │
│    (cloud only) ✓ Qarote's agent is already watching 24/7 —    │
│                   findings appear below even before you wire.  │
└─────────────────────────────────────────────────────────────────┘

CÂBLÉ ───────────────────────────────────────────────────────────┐
│  ✓ 2 agents connected · last call 3 min ago (get_overview)     │
│    Claude Code · Cursor          [Manage keys] [+ Wire agent]  │
│    (cloud only) + Qarote agent watching 24/7                  │
└─────────────────────────────────────────────────────────────────┘
```

### ÉTAT C — cockpit calme

```
┌─────────────────────────────────────────────────────────────────┐
│  ● Connected to AWS RabbitMQ   v3.13.7   Erlang 26.2  [Add server]│
│                                                                   │
│  ┌─ YOUR AGENT ─ (cf. bloc selon mode ci-dessus) ──────────────┐ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ WHAT YOUR AGENT SEES RIGHT NOW ────────────────────────────┐ │
│  │  ● All quiet — no active findings in the last 2h           │ │
│  │  14 queues  0 depth  1.2ms  14 active  16% cpu  0.9GB       │ │
│  │  [ Queued messages ▁▁▂▁ ]   [ Message rates ▁▁▁▁ ]         │ │
│  │                                            ↳ Cluster detail │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ ASK YOUR AGENT ────────────────────────────────────────────┐ │
│  │  "What's wrong with my RabbitMQ right now?"          [copy] │ │
│  │  "Explain the last incident on orders.incoming"     [copy] │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### ÉTAT D — cockpit incident (le wedge vit ici, pas dans un onglet)

> **RCA = Root Cause Analysis** (analyse de cause racine) : le LLM n'affiche
> pas le symptôme, il explique *pourquoi* (cause + raisonnement). C'est la
> sortie de `explain_incident` / AI Explain.

```
│  ┌─ WHAT YOUR AGENT SEES RIGHT NOW ────────────────────────────┐ │
│  │  ⚠ 1 active finding                                         │ │
│  │  🔴 orders.incoming — consumers dropped, depth climbing     │ │
│  │     fired 6 min ago · CRITICAL                             │ │
│  │     [ ✨ Explain ]   ← clic ⇒ RCA en streaming (Dev+ / quota)│ │
│  │     ↳ même sortie que `explain_incident` côté agent        │ │
│  └─────────────────────────────────────────────────────────────┘ │
```

> **Code aujourd'hui = on-demand, au clic.** `DiagnosisCard.tsx:364-390` : le
> RCA ne part que sur clic du bouton `✨ Explain` (puis streaming + pill de
> quota `llmExplainsPerMonth` + regenerate). Pas d'auto-explain à la création
> du finding, aucun worker ne pré-génère. L'« auto-explain cloud » ci-dessous
> est une **proposition produit**, pas l'existant.

> **Proposition (à trancher)** : en **cloud**, l'agent managé pourrait
> *auto-expliquer* les findings → ils arriveraient déjà avec leur RCA
> (différenciateur cloud, push). En **self-hosted**, on reste au clic (humain
> ou son agent). Décision = Q1 ci-dessous.

---

## Workflows

### W1 — Activation (signup → valeur)

```
TOUT LE MONDE
  signup ─→ connect 1er serveur ─→ onboarding scan (findings instantanés)
         ─→ Home cockpit vivant (scan + état live, jamais vide)
         ─→ [Connect your agent] (mint clé + snippet, AgentKeyRevealDialog)
         ─→ ton agent appelle get_overview ─→ bloc YOUR AGENT passe à "câblé"

CLOUD, en plus
  dès le signup, l'agent managé surveille déjà 24/7 → findings (et RCA
  auto en cloud) visibles sans aucun câblage. Le flow MCP reste proposé,
  pour bosser depuis ton propre éditeur.
```

### W2 — Incident, piloté par l'humain (pull via UI)

```
rules engine détecte ─→ Home ÉTAT D (⚠) ─→ clic finding
  ─→ [Explain root cause] ─→ LLM RCA (EE) ─→ humain agit
```

### W3 — Incident, piloté par l'agent (pull via MCP) — happy path

```
humain : "qu'est-ce qui casse ?"
  ─→ agent ─→ list_incidents ─→ get_incident ─→ explain_incident
  ─→ réponse dans le chat (MÊME RCA que W2) · UI jamais ouverte
```

> W2/W3 renvoient le **même RCA** → l'UI ne fait que vérifier ce que l'agent
> expose. Pas de logique dupliquée.

### W4 — Push (personne ne regarde)

```
rules engine ─→ alert-worker ─→ email / Slack / webhook ─→ humain bipé
  (Notifications configure le canal) ─→ ouvre cockpit OU demande à l'agent
```

### W5 — Escape hatch ("je veux juste voir mes queues")

```
Topology ─→ clic nœud queue ─→ /queues/:name (inspect, purge)
   ou  ⌘K ─→ "users" / "policies" ─→ saute à la vue   (pas de section Browse)
```

---

## Réutilisé vs à designer

| Réutilisé tel quel | À designer (le vrai travail) |
|---|---|
| `AddServerForm` (→ déplacé dans signup) | **Signup multi-étapes + onboarding scan** (nouveau) |
| `AgentKeyRevealDialog` (wire, self-hosted) | Home pilotée par état (B/C/D) + **mode-aware** |
| pages diagnosis / alerts / charts | Bloc "Cluster" (connections/channels/nodes) |
| `Topology.tsx` drill-down | Câbler ⌘K en palette globale (primitif existe) |
| outils MCP (tous) | Bloc "YOUR AGENT" cloud (notre agent managé) |

> On touche : **signup**, **routing + nav**, **une Home state+mode-driven**.
> Les pages d'objets existantes restent, atteintes autrement.

## Acquis (vérifié dans le code)

- **`explain_incident` est universel**, gaté par **plan**, pas par déploiement
  (`features.ts:41`). Providers `LlmProvider` : `MANAGED` · `ANTHROPIC` ·
  `OPENAI` · `OLLAMA`.
  - Cloud = `MANAGED` (clé Qarote, zéro config, Enterprise).
  - Self-hosted = `OLLAMA` (local, offline) ou BYOK clé (Anthropic/OpenAI),
    Developer+.
- **Le tier vient de deux sources** (`license-tier-sync.service.ts:8`) :
  `Subscription.plan` (cloud, Stripe) **ou** `License.tier` (self-hosted, clé
  JWT). En self-hosted, **pas de clé de licence = free = pas d'AI Explain.**
  → Ollama et licence sont **séparés** : la licence donne le *droit*
  (Developer+), Ollama est juste *quel* LLM fait le calcul. Il faut **les
  deux** en self-hosted.
- **L'explain est on-demand, au clic** (`DiagnosisCard.tsx:364-390`) — streaming
  + quota `llmExplainsPerMonth` + regenerate. Pas d'auto-explain aujourd'hui.
- **Quota = compte d'appels/mois, MANAGED uniquement** (`quota.ts:76-78`) :
  `getCapForWorkspace` renvoie `null`/illimité si le provider n'est pas MANAGED.
  Donc le quota ne mord qu'en **cloud** (où Qarote paie la clé). Self-hosted
  (Ollama/BYOK) = pas de quota Qarote, l'user paie son propre LLM. **Les hits
  de cache ne comptent pas** (`quota.ts:20-22`).

## Décisions prises

1. **Pas d'auto-explain — on garde le clic partout.** Auto-expliquer chaque
   finding en cloud coûterait deux fois : (a) il crame le quota mensuel
   d'explains de l'user sur des findings qu'il n'a pas demandés ; (b) cloud =
   MANAGED = clé Anthropic de Qarote facturée → note LLM qui explose pour du
   RCA non lu. Le clic dépense la ressource métrée pile quand l'user signale
   son intention. (Échappatoire si besoin un jour : auto-explain *CRITICAL
   only*. Par défaut : clic.) → ÉTAT D garde le bouton `✨ Explain`.
2. **Self-hosted onboarding : demander une clé par défaut, Ollama en
   alternative visible.** Clé = un champ + meilleure qualité RCA (le wedge) +
   marche tout de suite. Ollama proposé clairement comme *"100% offline / rien
   ne sort de ton réseau"* pour les self-hosters data-residency — pas enterré,
   pas le défaut. (Suppose une **clé de licence** Developer+ active : sinon
   l'AI Explain est gaté en amont, indépendamment du provider.)
3. **Onboarding scan** : config scan seul (instantané), ou on attend aussi un
   premier diagnostic (qui lui demande de l'historique) ? (penche : scan
   config seul à froid, diagnostic se remplit ensuite)
4. **Cluster detail** (connections/channels/nodes) : onglet vs bloc dépliable ?
5. **Clés agent** : panneau dans la Home (`Manage keys`) vs Settings ?
6. **Diagnostic** : fondu dans la Home (ÉTAT D) vs route `/diagnosis` gardée
   pour deep-link/SEO + mapping 1:1 `explain_incident` ? (penche : fondu +
   deep-link `/diagnosis/:id`)

---

# Surface design complète — session 2026-06-06

Redesign confié à un outil "Claude design" (prompts par surface, validés
contre le code). Continuité visuelle : accent orange chaud, type clean,
monospace pour code/outils, dark-mode, WCAG AA. Trois produits : **site**
(qarote.io), **app** (app.qarote.io), **portal** (portal.qarote.io, licences
self-hosted).

## SITE marketing — conçu
- Landing (animation hero "topologie vivante que l'agent lit" : flow calme →
  incident → réticule agent → RCA ; reduced-motion = frame statique).
- Éléments préservés verbatim : navbar, **quote fondateur** ("The fix took five
  minutes / The diagnosis took forty / Qarote is the gap…"), quiz, FAQ, footer.
- Pages : Pricing · Features · Docs (hub + template article) · Changelog ·
  Blog (index + template) · About · "Qarote vs …" (template ×4 : Datadog,
  Grafana+Prometheus, CloudAMQP, New Relic) · Privacy · Terms · Security ·
  Cookie preferences.
- **Quiz game** (le jeu complet, pas juste le CTA préservé) : hero/start →
  20 questions (1/écran, progress) → email capture optionnel (skip OK, "no
  sign-up") → résultats score + tier (Reactive/Proactive/Production-Grade) +
  breakdown + carte sociale par tier. Composants existants : `QuizIsland`,
  `QuizHero`, `QuizResults`, `QuizEmailCapture`, `quiz-logic.ts`, `QuizLead`.
- ⚠️ Contenu Blog/About/Comparaisons : **ancien positionnement obsolète**
  (pivot) → tout réécrit en agent-first. Comparaisons cadrées **honnêtes /
  complémentaires** (pas "dashboard moins cher") ; CloudAMQP = "Qarote +
  CloudAMQP", pas un rival.
- ⚠️ Privacy/Terms = template seul, **pas de texte juridique inventé** (conseil
  légal). Security = vrais faits OK.
- Hors design : **Status** (page externe type statuspage).

## APP (app.qarote.io) — conçu
- Shell + nav réduite à 3 (Home cockpit · Notifications · Topology) + ⌘K ;
  breadcrumb **Organization › Workspace** (pairs, pas nesté) + selects
  Server/VHost.
- Écrans : Auth (sign in/up) · forgot/reset/verify · SSO callback · accept
  invite **org + workspace** · Onboarding scan · **Cockpit** (états non-câblé /
  calme / incident+explain) · Notifications (alerts + config scan) · Topology +
  drill-down · ⌘K.
- Settings : AI Explain (provider Managed/BYOK/Ollama + quota) · Agent keys ·
  Profile · Appearance · Workspace · Organization · Members · Subscription ·
  License · **SSO · SMTP · Audit**.
- Billing : Plans/Upgrade · PlanUpgradeModal · retours paiement.
- Bloc F (finition) : 404 · Help · **RCA partageable** (`/explanations/:id`) ·
  gate/quota/toast · **broker déconnecté** · mobile/dark systématiques ·
  **loading skeletons** (par-surface, dimensions = pas de layout shift, variante
  reduced-motion statique, anti-flash ~150ms).
- Sévérité **`INFO`** confirmée réelle (émise par config rules advisory :
  quorum-ha-policy, exclusive-in-prod, default-vhost-isolation, channel-prefetch,
  orphan-exchange) → garder la colonne dans le résumé de sévérités.
- Composants partagés : breadcrumb org›workspace · selects server/vhost ·
  Add server · Notifications settings · Connect your agent.
- **Trous à designer encore** (non couverts) : **Éditeur de règles d'alerte**
  (`AlertRulesModal`) · **Édition serveur** (`ServerManagement`) — c'est là que
  doit migrer l'**activation firehose** · **cycle de vie alerte**
  (ack/resolve) · **détail/dismiss finding config scan**.

## PORTAL (portal.qarote.io) — conçu
- Portail licences self-hosted : auth · overview licences · **Purchase**
  (tier → checkout Stripe → clé émise) · **Management/Billing** (clé JWT
  copy/download, renew/upgrade, factures) · legal. La clé se colle dans l'app
  → Settings → License (boucle bouclée).

## DROPPÉ (décision agent-first — hide, don't delete)
- Admin CRUD broker : users RabbitMQ · policies · definitions · vhost-CRUD ·
  create queue/exchange → ⌘K escape hatch.
- Pages **messages** (firehose UI) · **digest** · **feedback** → mises de côté
  pour la V1. (Digest : retirer aussi le bloc "Custom digest" du modal
  Notification settings ; garder au plus le toggle de cadence, ou rien.)
- Gardé minimal : vhost selector (contexte) · Cluster detail read-only
  (connections/channels/nodes) · queues/exchanges via Topology + purge.

## DÉCISIONS À TRANCHER (rappel)
- **Message publishing** (`SendMessageDialog`) : garder ou dropper ?
- **RBAC / Roles** (RolesSection/RoleEditor) : revient dans le scope (comme
  SSO/Audit) ou reste différé ?
- Emails transactionnels : hors scope redesign ? (à confirmer)

## PROCHAINE FRONTIÈRE — Remédiation (hors redesign, cap produit)

Fermer la boucle diagnose → fix. Deux couches qui appellent **la même couche
d'action** : (1) bouton "Fix this" sur un finding (humain, UI), (2) outils MCP
d'action (agent) — `apply_dlx`, `set_policy`, `purge_queue`, `requeue_dlx`…
Build once, surfacé bouton + MCP.

### Faisabilité technique — VÉRIFIÉ (2026-06-06)
Toutes les primitives d'écriture existent dans `core/rabbitmq/ApiClient.ts` :
`createExchange`/`deleteExchange`, `createQueue`/`deleteQueue`/`purgeQueue`,
**`createOrUpdatePolicy`** (`:1474`)/`deletePolicy`, **`bindQueue`**,
`createVHost`, `createUser`, permissions. Donc on a la main complète sur l'API
Management.

### Le critère qui décide : misconfig vs symptôme
**Le finding correspond-il à une misconfiguration réparable par un write broker
sûr ?**
- **Config findings = misconfigurations** → un write les corrige. One-click
  faisable (sous-ensemble).
- **Alertes runtime (22 `AlertType`) + incidents diagnostiqués = symptômes**
  (charge / app / infra) → **aucun write broker ne les répare**. Vérifié règle
  par règle. Le fix vit dans le code/infra du client. **One-click = quasi
  exclusivement config scan.**

### 3 buckets → 3 affordances
- **Safe-additif** (config) → bouton **`Fix this`**. Ex : missing-dlx,
  quorum-ha-policy, quorum-no-delivery-limit, conflicting-policies.
- **Destructif/ciblé** (config + bande-pansements alertes) → **action gardée**
  (confirm/dry-run), jamais "Fix this". Ex : guest-user, orphan-exchange,
  delete idle queue ; purge/requeue/pause sur alertes.
- **App-side / migration / symptôme** (la plupart des alertes+incidents,
  channel-prefetch, exclusive-in-prod, classic-mirrored) → **pas d'action**,
  juste Explain + recommandation.

### Piège recette DLX
Une policy DLX seule = demi-fix : sans queue bindée au DLX, les messages
disparaissent toujours. Vrai one-click DLX = exchange + dead-letter queue +
binding + policy (4 ops, défauts sensés). Chaque règle déclare *si* auto-fixable
+ *sa recette* (`missing-dlx.ts` existe déjà).

### Garde-fous obligatoires
Scopes clé (**explain/read vs act/write** — une clé read ne doit PAS pouvoir
agir) · **preview/dry-run** (montrer ce qui sera créé) · audit (`AuditLog` a
déjà `rabbitmq.*`) · re-scan de vérification · réversibilité · tiering.

### ⚠️ ZÉRO overlap avec `explain_incident` (4 frontières)
1. **Explication = UN moteur, deux surfaces** (UI "Explain" + MCP
   `explain_incident`) → sortie identique, l'UI ne rédige jamais un 2e avis.
2. **Explain (lire) ≠ Remédier (agir)** — verbes/outils distincts.
   `explain_incident` recommande mais n'agit pas ; `Fix this`/`apply_dlx`
   exécute mais ne ré-explique pas. La recommandation est le pont ; ils
   composent.
3. **Pas de bloc "action recommandée" rédigé par l'UI** : la recommandation est
   un **champ de la sortie de `explain_incident`**, l'UI la *rend*, ne l'ajoute
   pas. Carte alerte/incident = `[Explain]` (RCA recommandation incluse) + au
   plus une action gardée. Aucun avis autonome côté UI.
4. **Config : statique (règle) ≠ IA.** "What & why" + étapes "How to fix" =
   rédigés par la règle, déterministes. `[Explain this finding]` = même moteur
   d'explication appliqué à un *finding* (approfondissement situé optionnel),
   pas un 2e explainer. `[Fix this]` = l'action.

> Principe : **une seule capacité d'explication** (moteur unique, UI + MCP) ; la
> **recommandation est un champ de l'explication, pas un texte d'UI** ;
> **l'action est une couche séparée** qui consomme la recommandation sans la
> ré-énoncer.

### Fondation existante (vérifié)
`explain_incident` aujourd'hui = **narrateur de diagnostic read-only** : prose RCA
ancrée sur une evidence riche (broker state, queue config, co-firing, topologie,
changements config depuis l'audit log, baselines, ~10 signaux firehose), anti-
hallucination strict (`finding.context.ts`). **Sortie = prose, pas une action
structurée.** Le finding porte déjà un champ "Current recommendation" (rédigé
par la règle). → **L'exécutable ne vient JAMAIS du LLM** (hallucination sur prod
= interdit) : il vient de la **règle** (déterministe).

### Format de recette — SPEC DE RÉFÉRENCE
Objet `Remediation` attaché à la règle, consommé par le bouton "Fix this" ET
l'outil MCP (build once). 6 `kind` couvrent toutes les éventualités :

```ts
type Remediation =
  | { kind:"auto";             risk:"additive"; title; ops:Op[]; defaults; reversible:true }
  | { kind:"auto-destructive"; risk:"destructive"; title; ops:Op[]; guard }
  | { kind:"choice";           title; options:{label; ops:Op[]}[] }
  | { kind:"cluster";          risk:"cluster-wide"; title; ops; guard }   // scope admin
  | { kind:"migration";        title; steps:GuidedStep[] }                // jamais one-click
  | { kind:"manual";           guidance:string[] };                       // pas de bouton
type Op = { operation:"createExchange"|"createQueue"|"bindQueue"
          |"createOrUpdatePolicy"|"deleteExchange"|"deleteQueue"|"purgeQueue"
          |"deletePolicy"|"deleteUser"|"setClusterParam"; vhost; target; params? };
```

**Contrat d'exécution (tout kind exécutable)** : `preview → check scope → confirm
→ exécuter ops (ordonné, stop-on-error, rollback partiel pour additif) → audit
chaque op → re-scan`. Scope : `read` rien · `manage` auto/auto-destructive ·
`admin` cluster. Confirm : additif simple · destructif type-to-confirm · cluster
admin. MCP : `apply_remediation(findingId)` (auto) ; token de confirm explicite
(destructif/cluster) ; `option` (choice) ; manual/migration = guidance, pas
d'exécution.

### Balayage des 13 règles config
| Règle | kind |
|---|---|
| missing-dlx | **auto** (exchange+queue+binding+policy — la DLQ bindée évite le demi-fix) |
| quorum-no-delivery-limit · quorum-ha-policy | **auto** (policy additive) |
| orphan-exchange | **auto-destructive** faible risque (pas de data) |
| guest-user-enabled | **auto-destructive** (precheck lockout : ≥1 autre admin) |
| no-consumer-backlog (idle) | **auto-destructive** **perte de données** (type-to-confirm + option purge) |
| conflicting-policies | **choice** (Qarote ne décide pas qui gagne) |
| default-vhost-isolation | **choice/migration** |
| watermark-misconfig · quorum-minority-replicas | **cluster** (scope admin) |
| classic-mirrored-deprecated | **migration** (data move + repoint app) |
| channel-prefetch · exclusive-in-production | **manual** (côté consumer/déclaration, aucun write broker) |

Seuls les **3 `auto`** sont de vrais one-click. Le reste = gardé / à choix /
confirmation forte / guidé / pas de bouton.

### Scope : config scan vs alertes
**Format universel** (objet `Remediation` sur n'importe quelle règle), mais
distribution des kinds très différente :
- **Config scan** = là où vit le vrai `auto` (one-click) + tout le spectre.
- **Alertes / incidents** = quasi exclusivement `manual` (guidance : scale
  consumers, fix l'app) + parfois `auto-destructive` bande-pansement (purge /
  requeue-from-DLX / pause). **Aucun `auto`** (on ne répare pas un symptôme par
  un write additif). Au plus `choice`/`cluster` qui *masque* (max-length,
  watermark), jamais qui *répare*.
→ Pour les alertes, le "fix" = la recommandation de l'Explain (prose) + l'action
sur *les systèmes du client*, pas Qarote sur le broker.

### Parké (2026-06-07) — focus incidents uniquement
Le management-via-agent **freeform** est mis de côté (scope creep) : publish
message, export/import definitions, pause queue, CRUD direct queue/exchange/
policy/user/vhost en commandes agent libres, l'ambition "deux familles MCP /
control plane / remplacer le dashboard à 100%". **Focus = incidents** :
diagnostic + remédiation **bornée**. L'exécuteur d'`Op` se construit pour la
remédiation, mais n'est atteignable **que via les recettes déterministes de
règles** (`apply_remediation(findingId)`) — jamais composé librement par
l'agent. Donc aucune surface dangereuse freeform (`delete vhost`, `import
definitions`) ouverte.

Étape délibérée et gardée — pas dans ce redesign.

## Modèle d'alerte unifié (décidé 2026-06-07)

### État actuel — ~3 systèmes (le problème "deux modèles")
| Système | Détection | Sortie | Push + lifecycle ? |
|---|---|---|---|
| **AlertRule METRIC** | seuil statique (consumer ≥1, depth ≥50k) | `Alert` row → onglet **Alerts** | ✅ email/slack/webhook + claim/resolve (`alert.notification.ts`) |
| **AlertRule CONFIG** | anti-pattern structurel | `ConfigFinding` → onglet **Config scan** | ✅ |
| **Incident diagnosis** | windowed + co-firing (le wedge) | cockpit + `explain_incident` | ❌ aucun push, aucun lifecycle |

Vérifié : l'onglet **Alerts affiche les règles MÉTRIQUES** (ex `consumer-count-zero`,
threshold ≥1 vs actual 0), PAS le diagnostic. Le diagnostic est séparé, ne crée
pas d'`Alert`, ne notifie pas. → "deux modèles" = métrique vs diagnostic.

### Pourquoi récupérer les règles métriques (légitimes)
1. **Couverture immédiate / cold-start** : le diagnostic a besoin de ~180 min
   d'historique. Node-down, memory/disk alarm doivent biper instantanément →
   les seuils point-in-time sont ce plancher.
2. **Elles possèdent toute l'infra PUSH + lifecycle** (email/slack/webhook,
   fingerprint, re-fire, claim/resolve/snooze). Le diagnostic a les smarts mais
   pas le push. → on fusionne, on ne jette rien.

### Le modèle unique : `Rule → Finding`
Une abstraction. Ce qui varie = le **kind de détection** :
| Kind | Fire | Rôle |
|---|---|---|
| **point-in-time** (ex-métrique) | immédiat, sans historique | plancher cold-start, toujours-on |
| **windowed / diagnostic** | après warm-up, contextuel | la couche smart (wedge) |
| **config / structural** | point-in-time structurel | anti-patterns |

**Épine dorsale partagée par les 3 kinds** : sortie = un *finding* (sévérité,
source) · **`explain_incident` s'applique à n'importe quel finding** (plus de
"maps to a diagnosable incident") · **remédiation** = la recette quand applicable
· **push** = severity routing → email/slack/webhook (l'infra `Alert` devient le
tronc commun) · **lifecycle** = active→claim→resolve→snooze + fingerprint/re-fire.

→ Les seuils métriques = **le kind point-in-time** du modèle unique. Les ~25
défauts deviennent les règles les plus simples (plancher immédiat) ; le
diagnostic windowed prend le relais une fois l'historique chaud. Complémentaires
dans le temps, pas redondants.

### Critère de tri (règle par règle)
*"Existe-t-il une règle windowed qui détecte mieux ?"*
- Oui → la métrique devient fallback cold-start ou se retire (ex : `queue depth
  > 10000` subsumé par `queue-backlog`).
- Non → reste le kind point-in-time (ex : node-down, memory/disk alarm —
  immédiat irremplaçable).

### Impact UI
Pas de fusion d'onglets forcée : Notifications reste le **push** (ce qui bipe un
humain), cockpit montre l'**état courant**. Mais ça supprime la confusion
"alerte métrique ou diagnostic ?" — tout est un *finding* avec Explain + (si
applicable) Fix. L'infra notification/lifecycle d'`Alert` = le tronc commun.

### Où s'affichent les findings du diagnostic (décidé 2026-06-07)
Aujourd'hui les incidents diagnostic vivent SEULEMENT dans le cockpit (pas de
push, pas de lifecycle) → un diagnostic critique ne bipe personne. **C'est le
trou que l'unification ferme.** Une fois sur l'épine commune :
- **Notifications > Alerts** = "les findings qui doivent biper un humain" =
  **métrique ET diagnostic** (worklist + claim/resolve/snooze, severity-routed).
- **Cockpit** = état courant (les mêmes findings, vue glance). Pas de
  duplication — deux jobs (état vs worklist), comme status board + file PagerDuty.
- **Notifications > Config scan** = findings config (advisory, off du push par
  défaut).
→ L'onglet "Alerts" devient "findings page-worthy (métrique + diagnostic)", pas
"alertes de seuils".

### Surface tunable par kind + YAGNI seuils (décidé 2026-06-07)
Vérifié : `AlertRule` (métrique) = `threshold`+`operator`+`severity` tunables ;
`DiagnosisRuleConfig` (windowed) = **`enabled` uniquement** (auto-calibré, aucun
seuil exposé).
| Kind | Surface tunable |
|---|---|
| point-in-time | seuil + opérateur + sévérité + on/off |
| windowed | **on/off uniquement** (auto-calibré — le win agent-first) |
| config | on/off + sévérité |

**YAGNI au lancement** : on ship **défauts (~25) + on/off par règle** ; **PAS**
l'éditeur de seuil. Le backend `AlertRule.threshold` existe, on diffère juste
l'UI. Surface "règles" au lancement = **liste avec toggles** + seuil **affiché en
lecture seule** (informatif), pas éditable. **Tripwire** → 1er user qui veut
*garder* une règle à un *autre* seuil (pas la couper) = construire l'éditeur
(fast-follow). L'écran "Éditeur de règles d'alerte" sort du scope de lancement.

### Taille de la migration (sizing vérifié 2026-06-07)
**Medium et incrémentale, PAS big-bang.** Beaucoup est déjà scaffoldé :
- **3 tables persistées** déjà : `Alert` (métrique), incident findings,
  `ConfigFinding` — rien à créer.
- **Explain déjà polymorphe** : `LlmExplanation` → `incidentFindingId` |
  `configFindingId` | `traceEventId` (gros morceau déjà unifié).
- **Lifecycle + `supersededBy`** déjà présents (formes différentes : `Alert` a
  ACTIVE/ACK/RESOLVED + fingerprint ; diagnostic/config ont open/resolved +
  supersededBy).
- Pattern discriminateur `AlertRule.evaluator` METRIC/CONFIG → ajouter
  "windowed" suit un pattern établi.

**Le vrai gap** : le push est en forme `Alert` (`alert.notification.ts` prend
`RabbitMQAlert[]`) et le diagnostic n'a **aucun chemin vers le push**. Travail
concentré sur 3 points : (1) **adaptateur** diagnostic → push (matérialiser un
incident comme `Alert` row avec lien, OU généraliser le service de notif) ;
(2) réconcilier les lifecycles ; (3) UI Notifications inclut le diagnostic +
**dedup cross-système** (le risque est ici — un `consumer-count-zero` métrique
ET un `consumer-crash` diagnostic sur le même incident → ne pas double-biper ;
`supersededBy` donne une avance, reste à le faire entre systèmes).

**NE PAS collapse les 3 tables en une** (→ deviendrait gros, migration de
données, risqué, inutile). Garder les tables séparées + **couche de lecture
commune `Finding` + adaptateur push**. Plumbing, pas data-migration.

**Séquençage (chaque phase shippable)** :
| Phase | Quoi | Taille |
|---|---|---|
| 1 | Afficher les findings diagnostic dans Notifications (read-only) | petit (query+UI) |
| 2 | Pusher les diagnostics critiques (adaptateur → notif existant) | medium |
| 3 | Lifecycle unifié (claim/resolve/snooze) + dedup cross-système | medium (le risque) |
| 4 | Couche `Finding` propre + retirer seuils redondants | optionnel, plus tard |

→ **Pré-lancement = Phase 1–2** (diagnostic visible + push des criticals, sans
toucher au modèle de données). Phase 3 (dedup) quand on a le temps de bien faire.

## ⚠️ Dépendance à ne pas casser à l'implémentation
Retirer la page `/messages` est OK, mais le **CTA d'activation du firehose**
y vit aujourd'hui, et le firehose alimente le LLM. Migrer l'activation
(auto à la connexion serveur, ou toggle dans Édition serveur) — sinon
diagnostic dégradé. Voir [[project_qarote_firehose_dependency]].

## Ordre d'implémentation proposé (PRs)
shell+nav+breadcrumb → cockpit → auth/onboarding → Settings+billing → bloc F →
dissolution Browse + migration activation firehose. (Remédiation = plus tard.)
