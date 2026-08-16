import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { fileToResizedDataUrl } from "@/lib/imageResize";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useUpdateOrganization } from "@/hooks/queries/useOrganization";

import type { OrganizationSummary } from "./types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB source cap (resized down on upload)

interface OrgInfoCardProps {
  org: OrganizationSummary;
  isOrgAdmin: boolean;
}

/**
 * Organization general info (prototype `.scard` + `.avatar-up` + `.sluginput`
 * + `.savebar`): logo, name, slug with a live-availability indicator, and
 * billing contact. Always-editable with a dirty-only Save, admin-gated.
 *
 * The parent remounts this with `key={org.id}` so switching orgs resets the
 * form to the new org's values without an effect. The logo "upload" resizes
 * client-side to a small data URL stored in `logoUrl` (no object storage).
 */
export function OrgInfoCard({ org, isOrgAdmin }: OrgInfoCardProps) {
  const { t } = useTranslation("profile");
  const updateOrg = useUpdateOrganization();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [contactEmail, setContactEmail] = useState(org.contactEmail ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logoUrl ?? null);
  const [uploading, setUploading] = useState(false);

  const slugChanged = slug !== org.slug;
  const slugFormatValid =
    slug.length >= 3 && slug.length <= 48 && SLUG_RE.test(slug);
  // Check availability whenever the slug is a valid, changed value. React Query
  // dedupes + caches (30s), and the field is rarely edited, so a per-keystroke
  // check is cheap and avoids a fragile debounce-effect.
  const checkEnabled = isOrgAdmin && slugChanged && slugFormatValid;

  const slugQuery = trpc.organization.management.checkSlug.useQuery(
    { slug },
    { enabled: checkEnabled, staleTime: 30_000, refetchOnWindowFocus: false }
  );

  type SlugStatus = "current" | "invalid" | "checking" | "available" | "taken";
  const slugStatus: SlugStatus = !slugChanged
    ? "current"
    : !slugFormatValid
      ? "invalid"
      : // couldn't verify (error / rate limit) — don't block; Save still validates
        slugQuery.isError
        ? "current"
        : slugQuery.isFetching || !slugQuery.data
          ? "checking"
          : slugQuery.data.available
            ? "available"
            : "taken";

  const dirty =
    name !== org.name ||
    slug !== org.slug ||
    contactEmail !== (org.contactEmail ?? "") ||
    logoUrl !== (org.logoUrl ?? null);

  const canSave =
    isOrgAdmin &&
    dirty &&
    name.trim().length >= 2 &&
    (!slugChanged || (slugFormatValid && slugStatus !== "taken")) &&
    !updateOrg.isPending;

  const handleLogo = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(t("org.logoTooLarge"));
      return;
    }
    setUploading(true);
    try {
      setLogoUrl(await fileToResizedDataUrl(file, 256));
    } catch (error) {
      logger.error({ error }, "Logo resize failed");
      toast.error(t("org.logoFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await updateOrg.mutateAsync({
        name: name || undefined,
        slug: slug.trim(),
        contactEmail: contactEmail || null,
        logoUrl,
      });
      toast.success(t("org.toast.orgUpdated"));
    } catch (error) {
      logger.error({ error }, "Update org error");
      const code = (error as { data?: { code?: string } })?.data?.code;
      if (code === "CONFLICT" && error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t("org.toast.orgUpdateFailed"));
      }
    }
  };

  const disabled = !isOrgAdmin || updateOrg.isPending;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Logo */}
      <div className="mb-5 flex items-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="h-[60px] w-[60px] rounded-[14px] object-cover"
          />
        ) : (
          <span
            className="flex h-[60px] w-[60px] items-center justify-center rounded-[14px] bg-primary font-heading text-xl font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {(org.name[0] ?? "?").toUpperCase()}
          </span>
        )}
        {isOrgAdmin && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                void handleLogo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("org.uploadLogo")}
            </Button>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="org-name">{t("org.orgNameLabel")}</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("org.namePlaceholder")}
          disabled={disabled}
        />
      </div>

      {/* Slug */}
      <div className="mt-3.5 space-y-1.5">
        <Label htmlFor="org-slug">{t("org.slug")}</Label>
        <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-1 focus-within:ring-ring">
          <span className="flex shrink-0 items-center bg-muted px-3 font-mono text-sm text-muted-foreground">
            qarote.io/
          </span>
          <input
            id="org-slug"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            placeholder={t("org.slugPlaceholder")}
            disabled={disabled}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none disabled:cursor-not-allowed"
          />
        </div>
        {slugStatus === "current" ? (
          <p className="text-xs text-muted-foreground">{t("org.slugDesc")}</p>
        ) : slugStatus === "invalid" ? (
          <p className="text-xs text-destructive">{t("org.slugDesc")}</p>
        ) : slugStatus === "checking" ? (
          <p className="text-xs text-muted-foreground">
            {t("org.slugChecking")}
          </p>
        ) : slugStatus === "available" ? (
          <p className="flex items-center gap-1 text-xs text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {t("org.slugAvailable")}
          </p>
        ) : (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {t("org.slugTaken")}
          </p>
        )}
      </div>

      {/* Billing contact */}
      <div className="mt-3.5 space-y-1.5">
        <Label htmlFor="org-email">{t("org.billingContactLabel")}</Label>
        <Input
          id="org-email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder={t("org.billingEmailPlaceholder")}
          disabled={disabled}
          className="font-mono"
        />
      </div>

      {isOrgAdmin && (
        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button onClick={handleSave} disabled={!canSave}>
            {updateOrg.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {t("org.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
