/**
 * Public documentation URLs surfaced from the app.
 *
 * Centralised so that each link target is referenced once and the
 * acceptance criterion in `docs/plans/messages-ui-coherence.md` (every
 * link points to the same docs page) is statically enforceable via
 * import grep.
 */

const DOCS_BASE_URL = "https://qarote.io/docs";

/** Tracing vs Spy comparison page — used by 4 link points across the
 *  Messages page so the user can disambiguate the two features. */
export const TRACING_VS_SPY_DOCS_URL = `${DOCS_BASE_URL}/tracing-vs-spy/`;
