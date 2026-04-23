/**
 * Alert seeding service — CE-safe registry adapter.
 *
 * CE default: no-op (alerts are an EE feature).
 * EE: src/ee/bootstrap.ts calls registerAlertSeeding() at startup to
 * inject the real seedDefaultAlertRules implementation.
 */

type SeedFn = (serverId: string, workspaceId: string) => Promise<void>;

let _impl: SeedFn = async () => {};

/** Called by EE bootstrap to register the real alert-seeding implementation. */
export function registerAlertSeeding(fn: SeedFn): void {
  _impl = fn;
}

/** Seed default alert rules for a newly-created server. No-op in CE. */
export function seedDefaultAlertRules(
  serverId: string,
  workspaceId: string
): void {
  _impl(serverId, workspaceId).catch((_err) => {
    // Swallow rejections so server creation is never blocked or rolled back.
    // The EE implementation is expected to handle its own errors internally,
    // but we guard here as a belt-and-suspenders measure.
    // Logging is intentionally omitted here — the EE impl logs its own errors.
  });
}
