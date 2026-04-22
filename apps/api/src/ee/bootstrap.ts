/**
 * EE bootstrap — registers EE implementations into CE-side registries.
 * Imported as a side-effect by src/ee/trpc/router.ts so that EE features
 * are wired up as soon as the EE router is loaded at server startup.
 */

import { registerAlertSeeding } from "@/services/alerts/alert-seeding.service";

import { seedDefaultAlertRules } from "@/ee/services/alerts/alert.default-rules";

registerAlertSeeding(seedDefaultAlertRules);
