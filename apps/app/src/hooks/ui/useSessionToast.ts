import { useEffect } from "react";

import { toast } from "sonner";

/**
 * SessionStorage key used to persist toast data across page reloads.
 * Write a JSON `{ title, description? }` to this key before navigating,
 * and useSessionToast will display it after the next mount.
 */
export const SESSION_TOAST_KEY = "toast";

/**
 * Read and display any pending toast stored in sessionStorage.
 * Used after full-page navigation (org/workspace switch) to show feedback.
 */
export function useSessionToast() {
  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_TOAST_KEY);
    if (!raw) return;
    sessionStorage.removeItem(SESSION_TOAST_KEY);
    try {
      const data = JSON.parse(raw) as {
        title: string;
        description?: string;
      };
      toast.success(data.title, {
        description: data.description,
      });
    } catch {
      // Malformed toast data -- ignore silently
    }
  }, []);
}
