import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { IslandProvider } from "@/components/IslandProvider";

export function ConsentBannerIsland({
  locale,
  resources,
}: {
  locale: string;
  resources: Record<string, Record<string, unknown>>;
}) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <ConsentBanner />
    </IslandProvider>
  );
}
