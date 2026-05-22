import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import type { TrpcForbiddenEventDetail } from "@/lib/trpc/forbiddenLink";

/**
 * Listens for `trpc:forbidden` events dispatched by the forbidden tRPC
 * link and surfaces a translated toast.
 *
 * Lives in React (not in the link) so `t()` is available — the link
 * itself fires outside React's lifecycle.
 *
 * Mount once near the app root, after Sonner is in the tree.
 */
export const ScopeDeniedToastListener = () => {
  const { t } = useTranslation("profile");

  useEffect(() => {
    const onForbidden = (event: Event) => {
      const detail = (event as CustomEvent<TrpcForbiddenEventDetail>).detail;
      const permission = detail?.permission ?? null;
      // Targeted message names the permission when the server sent one;
      // otherwise fall back to a generic message instead of rendering an
      // empty-quoted placeholder.
      const message = permission
        ? t("team.toast.scopeDenied", { permission })
        : t("team.toast.scopeDeniedGeneric");
      toast.error(message);
    };
    window.addEventListener("trpc:forbidden", onForbidden);
    return () => {
      window.removeEventListener("trpc:forbidden", onForbidden);
    };
  }, [t]);

  return null;
};
