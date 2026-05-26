import { useEffect, useRef } from "react";

import { CheckCircle2, Loader2 } from "lucide-react";

export interface LogEntry {
  id: string;
  text: string;
  done?: boolean;
}

interface ScanLogStreamProps {
  entries: LogEntry[];
  activeText?: string;
  // When the stream lives inside another aria-live region (e.g. the explain
  // panel), set announce={false} so screen readers don't double-announce each
  // step. Defaults to true for the standalone scan page.
  announce?: boolean;
}

export function ScanLogStream({
  entries,
  activeText,
  announce = true,
}: ScanLogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, activeText]);

  return (
    <div
      {...(announce ? { role: "log" } : {})}
      aria-live={announce ? "polite" : "off"}
      aria-atomic="false"
      className="font-mono text-xs leading-relaxed space-y-1 overflow-y-auto max-h-full pr-1"
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500 dark:text-green-400" />
          <span className="text-foreground/80 break-all">{entry.text}</span>
        </div>
      ))}
      {activeText && (
        <div className="flex items-start gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground break-all">{activeText}</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
