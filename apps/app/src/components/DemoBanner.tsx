const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="bg-warning-muted text-warning text-center text-sm font-medium py-1.5 px-4">
      This is a read-only demo.{" "}
      <a
        href="https://qarote.io"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80"
      >
        Deploy your own Qarote
      </a>{" "}
      to unlock all features.
    </div>
  );
}
