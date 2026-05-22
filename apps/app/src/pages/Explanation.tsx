import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

import { CONFIG_FINDING_PROMPT_VERSION } from "@api/ee/services/llm/context-builders/config-finding.context";
import { FINDING_PROMPT_VERSION } from "@api/ee/services/llm/context-builders/finding.context";
import DOMPurify from "dompurify";
import { AlertTriangle } from "lucide-react";
import { marked } from "marked";

import { formatRelativeAgo } from "@/lib/formatRelativeAgo";

import { ExplanationActions } from "@/components/llm/ExplanationActions";
import { PageShell } from "@/components/PageShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { useExplanation } from "@/hooks/queries/useExplanation";

const DOMPURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "blockquote",
    "h3",
  ],
  ALLOWED_ATTR: [],
};

function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(
    marked.parse(text, { async: false }),
    DOMPURIFY_CONFIG
  );
}

const CURRENT_PROMPT_VERSIONS = new Set([
  FINDING_PROMPT_VERSION,
  CONFIG_FINDING_PROMPT_VERSION,
]);

function SupersededBanner({
  supersededAt,
  creator,
  supersedingId,
}: {
  supersededAt: string;
  creator: { name: string; firstName: string; lastName: string } | null;
  supersedingId: string | null;
}) {
  const { t } = useTranslation("scan");
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bannerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        bannerRef.current?.classList.toggle(
          "is-offscreen",
          !entry.isIntersecting
        );
      },
      { threshold: 0 }
    );
    observer.observe(bannerRef.current);
    return () => observer.disconnect();
  }, []);

  const time = formatRelativeAgo(supersededAt, "just now");
  const authorLine = creator
    ? t("explain.superseded.bannerWithAuthor", {
        name: creator.name || `${creator.firstName} ${creator.lastName}`,
        time,
      })
    : t("explain.superseded.bannerNoAuthor", { time });

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      className="sticky top-0 z-10 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-200 flex items-center justify-between gap-4"
    >
      <span>{authorLine}</span>
      {supersedingId && (
        <Link
          to={`/explanations/${supersedingId}`}
          className="text-xs font-medium underline-offset-2 hover:underline shrink-0"
        >
          {t("explain.superseded.viewLatest")}
        </Link>
      )}
    </div>
  );
}

export default function Explanation() {
  const { t } = useTranslation("scan");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useExplanation(id ?? "");

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <SidebarTrigger />
        </div>
        <div className="p-6 max-w-2xl space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <SidebarTrigger />
        </div>
        <div className="p-6 max-w-2xl">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {(error as Error | null)?.message === "Not found"
                ? t("explain.page.notFound")
                : t("explain.page.loadError")}
            </AlertDescription>
          </Alert>
        </div>
      </PageShell>
    );
  }

  const isSuperseded = data.supersededAt != null;
  const isTrace = !data.incidentFindingId && !data.configFindingId;
  const hasDrift = !isTrace && !CURRENT_PROMPT_VERSIONS.has(data.promptVersion);

  // Determine context link: route back to the source page with ?findingId=
  // The source page auto-opens the explain panel for the matching finding.
  const contextHref = data.incidentFindingId
    ? `/diagnosis?findingId=${data.incidentFindingId}`
    : data.configFindingId
      ? `/scan?findingId=${data.configFindingId}`
      : null;

  return (
    <PageShell>
      {/* Superseded banner — sticky, rendered before content */}
      {isSuperseded && (
        // creator={null}: data.creator is the AUTHOR of this (stale)
        // explanation, not whoever regenerated. The API response doesn't
        // yet include the superseding explanation's creator, so we avoid
        // mis-attribution by falling back to the no-author banner.
        <SupersededBanner
          supersededAt={data.supersededAt!}
          creator={null}
          supersedingId={data.supersededBy}
        />
      )}

      <div className="flex items-center justify-between px-4 h-12 border-b border-border">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-sm font-medium text-foreground truncate max-w-xs">
            {data.incidentFindingId
              ? t("explain.page.headingIncident")
              : data.configFindingId
                ? t("explain.page.headingConfig")
                : t("explain.page.headingTrace")}
          </h1>
        </div>
        <ExplanationActions
          explanationId={data.id}
          content={data.content}
          disabled={false}
          feature={
            data.incidentFindingId
              ? "explain_finding"
              : data.configFindingId
                ? "explain_finding"
                : "explain_trace"
          }
          onRegenerate={() => {
            if (contextHref) navigate(contextHref);
          }}
          contextHref={contextHref ?? undefined}
        />
      </div>

      <div className="p-6 max-w-2xl space-y-4">
        {/* Drift hint — prompt version differs from current */}
        {hasDrift && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t("explain.driftHint")}
          </div>
        )}

        {/* Source-finding-deleted notice */}
        {!data.incidentFindingId &&
          !data.configFindingId &&
          !data.traceEventId && (
            <p className="text-xs text-muted-foreground">
              {t("explain.sourceDeleted")}
            </p>
          )}

        {/* Explanation content */}
        <div
          className="text-sm text-foreground leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_code]:font-mono [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-1 [&_pre]:bg-muted [&_pre]:rounded [&_pre]:p-3 [&_pre]:overflow-x-auto [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content) }}
        />

        {/* Metadata footer */}
        <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
          <p>{formatRelativeAgo(data.createdAt, "just now")}</p>
          <p>
            {data.provider} · {data.model} · prompt v{data.promptVersion}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
