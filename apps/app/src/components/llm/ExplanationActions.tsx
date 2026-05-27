import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Copy, ExternalLink, Link, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { track } from "@/lib/analytics";
import { isDemoMode } from "@/lib/runtimeConfig";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExplanationActionsProps {
  explanationId: string | null;
  content: string;
  disabled: boolean;
  onRegenerate: () => void;
  /** When provided, renders an "Open in context →" button (permalink page only). */
  contextHref?: string;
  /** PostHog feature tag, e.g. "explain_finding", "explain_trace". */
  feature?: string;
}

export function ExplanationActions({
  explanationId,
  content,
  disabled,
  onRegenerate,
  contextHref,
  feature = "unknown",
}: ExplanationActionsProps) {
  const { t } = useTranslation("scan");
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = explanationId
    ? `${window.location.origin}/explanations/${explanationId}`
    : null;

  const handleCopyMarkdown = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMarkdown(true);
      toast.success(t("explain.actions.copiedMarkdown"));
      track("llm_explain_copied_markdown", {
        feature,
        explanation_id: explanationId,
      });
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch {
      toast.error(t("explain.actions.copyFailed"));
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl || !explanationId) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success(t("explain.actions.copiedLink"));
      track("llm_explain_link_copied", {
        explanation_id: explanationId,
        feature,
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(t("explain.actions.copyFailed"));
    }
  };

  const handleRegenerate = () => {
    track("llm_explain_regenerated", {
      feature,
      explanation_id: explanationId,
    });
    onRegenerate();
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Copy markdown — primary action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              disabled={disabled || !content}
              onClick={handleCopyMarkdown}
              aria-label={t("explain.actions.copyMarkdown")}
              className="h-7 gap-1.5 px-2.5"
            >
              {copiedMarkdown ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {t("explain.actions.copyMarkdown")}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="sm:hidden">
            {t("explain.actions.copyMarkdown")}
          </TooltipContent>
        </Tooltip>

        {/* Copy share link — secondary action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || !shareUrl}
              onClick={handleCopyLink}
              aria-label={t("explain.actions.copyLink")}
              className="h-7 gap-1.5 px-2.5"
            >
              {copiedLink ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {t("explain.actions.copyLink")}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="sm:hidden">
            {t("explain.actions.copyLink")}
          </TooltipContent>
        </Tooltip>

        {/* Open in context — permalink page only */}
        {contextHref && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                asChild
                aria-label={t("explain.actions.openInContext")}
                className="h-7 gap-1.5 px-2.5"
              >
                <a href={contextHref}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t("explain.actions.openInContext")}
                  </span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="sm:hidden">
              {t("explain.actions.openInContext")}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Regenerate — ghost, disabled while streaming. Hidden in the
            public demo: there is no LLM key, so regenerating (which bypasses
            the seeded cache) would surface a backend error. */}
        {!isDemoMode() && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={handleRegenerate}
                aria-label={t("explain.actions.regenerate")}
                className="h-7 gap-1.5 px-2.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t("explain.actions.regenerate")}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="sm:hidden">
              {t("explain.actions.regenerate")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
