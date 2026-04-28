export function LegalSection({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="border border-border overflow-hidden scroll-mt-20"
    >
      <div className="px-6 py-4 border-b border-border flex items-center gap-4">
        <span
          className="text-xl font-normal text-primary/30 leading-none tabular-nums shrink-0"
          style={{ fontFamily: "var(--font-mono)" }}
          aria-hidden="true"
        >
          {String(index).padStart(2, "0")}
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h2>
      </div>
      <div
        className="p-6 space-y-4 text-muted-foreground"
        style={{ maxWidth: "72ch" }}
      >
        {children}
      </div>
    </section>
  );
}
