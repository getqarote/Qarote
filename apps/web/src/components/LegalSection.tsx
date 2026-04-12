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
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {index}. {title}
        </h2>
      </div>
      <div className="p-6 space-y-4 text-muted-foreground">{children}</div>
    </section>
  );
}
