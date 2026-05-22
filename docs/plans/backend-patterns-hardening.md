# Backend Patterns Hardening Plan

**Status**: Draft
**Author**: Brice (CTO)
**Date**: 2026-05-08
**Scope**: `apps/api/` — durcissement ciblé sur les chemins de notification (email, alerts, license, release) avec patterns backend éprouvés (Outbox, Distributed Lock, Idempotency Key, Circuit Breaker).

---

## Contexte

Audit du backend Qarote effectué le 2026-05-08. Le code est globalement solide :

- ✅ Stripe webhook signature (SDK officiel)
- ✅ Stripe webhook idempotency (`stripeWebhookEvent.processed`)
- ✅ Alert fingerprint deduplication
- ✅ Retry email avec exponential backoff + jitter
- ✅ Advisory locks sur `metrics-monitor` et `firehose-monitor`
- ✅ License renewal idempotency (`stripeInvoiceId` check)

Mais 3 chemins critiques présentent des risques de **double envoi de notifications client** lors d'un rolling deploy, d'un restart cron, ou d'un retry Stripe. Aucun ne provoque de perte de données ou de double facturation, mais tous dégradent la perception client (mails dupliqués, alertes redondantes).

Ce plan adresse en priorité les 3 critiques, puis les 3 importants. Les nice-to-have sont listés mais hors scope immédiat.

---

## Phase 1 — CRITIQUE (à shipper en premier)

### C1. Distributed lock sur `alert-monitor`

**Pourquoi en premier** : le code l'attend déjà (TODO ligne 12-20), le pattern existe à côté (`metrics-monitor.ts:32-77`), ~30 lignes de diff, risque d'effets de bord quasi nul.

**Fichiers**
- `apps/api/src/ee/workers/alert-monitor.ts` — ajouter le lock au démarrage
- `apps/api/src/workers/advisory-lock-keys.ts` — ajouter `alertMonitor: <bigint unique>`

**Implémentation**
1. Choisir une nouvelle clé bigint dans `ADVISORY_LOCK_KEYS` (ne pas collide avec metrics/firehose).
2. Wrapper le démarrage de `alert-monitor` dans `pg_try_advisory_lock` — si échec, log et exit gracefully.
3. Release le lock sur shutdown signal (SIGTERM/SIGINT) via `pg_advisory_unlock`.
4. Copier le pattern exact de `metrics-monitor.ts:32-77`.

**Test**
- Lancer 2 instances en parallèle en local → vérifier qu'une seule prend le lock.
- Kill l'instance "leader" → vérifier que la 2e prend le relai au prochain cycle.

**Critère d'acceptation**
- Lors d'un `dokku ps:restart` (rolling deploy), un seul worker alert-monitor traite les notifications à un instant T.

---

### C2. Outbox pattern sur les emails Stripe webhook

**Pourquoi** : dual-write hazard sur 4 chemins (welcome, renewal, license, etc.). Si l'email part mais le `db.update({ emailSentAt })` échoue, Stripe retry → email envoyé 2x.

**Fichiers**
- `apps/api/src/services/stripe/webhook-handlers.ts:187-194, 319-325, 756-762, 801-809`
- `apps/api/prisma/schema.prisma` — nouvelle table `NotificationOutbox` (multi-channel: email/slack/webhook)
- `apps/api/src/services/notification/notification-outbox.service.ts` (nouveau)
- `apps/api/src/cron/notification-outbox.cron.ts` (nouveau, drainé par `notification-worker`)

**Schéma DB**
```prisma
model NotificationOutbox {
  id           String   @id @default(cuid())
  template     String   // "welcome" | "renewal" | "license" | ...
  recipient    String
  payload      Json     // template variables
  idempotencyKey String @unique // ex: "stripe_webhook_evt_123:welcome:user_456"
  status       String   @default("PENDING") // PENDING | SENT | FAILED
  attempts     Int      @default(0)
  lastError    String?
  createdAt    DateTime @default(now())
  sentAt       DateTime?
  nextAttemptAt DateTime @default(now())

  @@index([status, nextAttemptAt])
}
```

**Flow**
1. Dans la transaction Stripe webhook : `prisma.$transaction([updateSubscription, createNotificationOutbox])`.
2. Worker `email-outbox` poll toutes les 30s les rows `PENDING` avec `nextAttemptAt <= now()`.
3. Envoie l'email, marque `SENT`. Si erreur : incrémente `attempts`, exponential backoff sur `nextAttemptAt`.
4. Après N attempts (ex: 10), marque `FAILED` et log/alert.

**Idempotency key** : `${stripeEventId}:${template}:${userId}` garantit que le retry Stripe ne crée pas une 2e row.

**Migration**
- Créer la table.
- Refactor 4 sites de webhook-handlers pour écrire dans Outbox au lieu d'envoyer direct.
- Démarrer le worker `email-outbox` dans le `Procfile` (ou ajouter au `worker` existant).

**Test**
- Simuler une erreur réseau pendant l'email → vérifier que le row reste `PENDING`, retry au cycle suivant.
- Simuler un retry Stripe (même `eventId`) → vérifier que `idempotencyKey` empêche le doublon (unique constraint).
- Vérifier que la transaction DB rollback si l'outbox insert échoue.

**Critère d'acceptation**
- Aucun email envoyé si la transaction DB échoue.
- Stripe retry sur le même event ne génère pas de 2e email.

---

### C3. Idempotency key + lock sur license expiration reminders

**Pourquoi** : race entre `findUnique()` (line 123-131) et `create()` (line 146) sans contrainte unique DB.

**Fichiers**
- `apps/api/prisma/schema.prisma` — ajouter unique constraint sur `licenseRenewalEmail(licenseId, reminderType)`
- `apps/api/src/cron/license-expiration-reminders.cron.ts:70-150` — utiliser `create()` dans try/catch ou `upsert()`
- `apps/api/src/workers/advisory-lock-keys.ts` — ajouter `licenseExpirationReminders` (en plus du lock alert-monitor)

**Implémentation**
1. Migration Prisma : `@@unique([licenseId, reminderType])` sur `LicenseRenewalEmail`.
2. Avant chaque cycle cron, acquire advisory lock (skip si pas obtenu).
3. Remplacer le pattern check-then-create par : `prisma.licenseRenewalEmail.create()` dans try/catch sur `P2002` (unique violation), OU `upsert()` qui ne fait rien si existe.
4. Idempotency key = `(licenseId, reminderType)` au niveau DB.

**Migration data**
- Vérifier qu'il n'y a pas déjà de duplicates en prod avant la migration. Si oui, dédupliquer manuellement (script).

**Test**
- Lancer 2 cycles cron en parallèle → vérifier qu'un seul email part par licence × reminderType.
- Crash mid-cycle → restart → vérifier pas de double envoi.

**Critère d'acceptation**
- Contrainte unique DB empêche tout doublon, même en cas de race.
- Lock empêche les cycles concurrents.

---

## Phase 2 — IMPORTANT (post-Phase 1)

### I1. Circuit breaker sur SMTP / EmailService
**Pourquoi** : SMTP cassé = 15s de blocage sur chaque webhook Stripe (3 retries × 5s) → Stripe timeout → retry → tempête.

**Fichiers** : `apps/api/src/services/email/core-email.service.ts`

**Implémentation**
- Lib légère (`opossum` ou hand-rolled) : track failures sur fenêtre glissante, open circuit après N échecs consécutifs.
- Quand circuit OPEN : fail-fast, push direct dans NotificationOutbox (Phase 1 C2) avec status `PENDING` et long backoff.
- Half-open après cooldown (ex: 60s) pour tester la reprise.

**Note** : devient quasi-trivial une fois Phase 1 C2 livrée — l'Outbox absorbe les fails.

---

### I2. Outbox par canal (email/Slack/webhook) sur alertes
**Pourquoi** : `alert.notification.ts:405-453, 456-513` stamp `emailSentAt` même si Slack/webhook fail → cooldown mal géré → re-send email.

**Fichiers** : `apps/api/src/ee/services/alerts/alert.notification.ts`

**Implémentation**
- Étendre `NotificationOutbox` en `NotificationOutbox` générique avec `channel: "email" | "slack" | "webhook"`.
- Chaque canal a sa propre row, son propre statut, son propre retry.
- `lastNotifiedAt` mis à jour seulement après succès du canal concerné.

---

### I3. Idempotency key sur release notifier
**Pourquoi** : pas de table de dédup contrairement à license renewal.

**Fichiers**
- `apps/api/prisma/schema.prisma` — nouvelle table `ReleaseNotificationSent(releaseVersion, userId)` avec `@@unique`
- `apps/api/src/cron/release-notifier.cron.ts`
- `apps/api/src/ee/workers/release-notifier.ts:28` — ajouter advisory lock

**Implémentation** : même pattern que C3 (unique constraint + lock).

---

## Phase 3 — NICE-TO-HAVE (backlog)

### N1. Webhook delivery user : DLQ + exponential backoff + jitter
**Fichiers** : `apps/api/src/ee/services/webhook/webhook.service.ts`
- Table `WebhookDeliveryAttempt` (DLQ).
- Retry async avec backoff exponentiel + jitter.
- Endpoint admin pour rejouer les DLQ.

### N2. Optimistic locking sur License/Subscription
**Fichiers** : `apps/api/prisma/schema.prisma` (License, Subscription)
- Ajouter `version Int @default(0)`.
- Check `version` sur mutations critiques.
- Risque actuel faible (mutations rares), donc backlog.

---

## Ordre d'exécution recommandé

1. **C1** (advisory lock alert-monitor) — quick win, ~30 lignes
2. **C3** (unique constraint + lock license reminders) — petite migration DB
3. **C2** (Outbox emails Stripe) — plus invasif, mais débloque I1/I2
4. **I1** (circuit breaker) — trivial une fois C2 en place
5. **I2** (Outbox par canal alertes) — réutilise infra C2
6. **I3** (idempotency release notifier) — réutilise pattern C3

Phase 3 en backlog selon priorité produit.

---

## Risques & rollback

- **C1** : risque nul, le pattern existe déjà. Rollback = revert le commit.
- **C2** : changement de chemin email → tester sur staging avec Stripe CLI replay. Feature flag possible (`USE_EMAIL_OUTBOX=true`) pour bascule progressive.
- **C3** : migration DB avec contrainte unique → vérifier absence de duplicates en prod avant. Script de check préalable.

---

## Métriques de succès

- 0 doublon de mail signalé par les clients sur 1 mois post-deploy.
- Worker alert-monitor : `pg_locks` montre exactement 1 holder à tout instant.
- Table `NotificationOutbox.status='FAILED'` monitored ; alerter si > 0 sur 1h.
