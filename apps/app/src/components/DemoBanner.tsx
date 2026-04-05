const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4">
      This is a read-only demo.{" "}
      <a
        href="https://qarote.io"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-amber-900"
      >
        Deploy your own Qarote
      </a>{" "}
      to unlock all features.
    </div>
  );
}
