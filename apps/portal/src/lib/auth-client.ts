import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  const config = (window as unknown as Record<string, unknown>)
    .__QAROTE_CONFIG__ as { apiUrl?: string } | undefined;
  return (
    import.meta.env.VITE_API_URL ?? config?.apiUrl ?? window.location.origin
  );
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});
