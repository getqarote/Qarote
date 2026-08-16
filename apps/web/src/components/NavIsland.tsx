import { IslandProvider } from "@/components/IslandProvider";
import Nav from "@/components/Nav";

interface NavIslandProps {
  locale?: string;
  resources?: Record<string, Record<string, unknown>>;
  /** Astro.url.pathname, for active-link state. */
  currentPath?: string;
}

/**
 * Island wrapper for the shared marketing {@link Nav}. Supplies the i18n +
 * react-query context (the GitHub star pill fetches via TanStack Query).
 * Rendered once in BaseLayout with `client:load`.
 */
export default function NavIsland({
  locale = "en",
  resources,
  currentPath,
}: NavIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <Nav currentPath={currentPath} />
    </IslandProvider>
  );
}
