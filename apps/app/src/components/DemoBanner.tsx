import { isDemoMode } from "@/lib/runtimeConfig";

export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="bg-warning text-warning-foreground text-center text-sm font-medium py-1.5 px-4 md:ml-64 transition-[margin] duration-200 ease-linear">
      This is a read-only demo.{" "}
      <a
        href="https://qarote.io"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-90"
      >
        Deploy your own Qarote
      </a>{" "}
      to unlock all features.
    </div>
  );
}
