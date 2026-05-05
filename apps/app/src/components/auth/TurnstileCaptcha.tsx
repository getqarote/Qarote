import { useEffect, useState } from "react";

import { Turnstile } from "@marsidev/react-turnstile";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export const turnstileEnabled = Boolean(SITE_KEY);

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

// TurnstileCaptcha is split into two components so that hooks (useEffect,
// useState) always run unconditionally inside TurnstileWidget, while the
// outer component can return null safely when the site key is not configured.
export function TurnstileCaptcha(props: TurnstileCaptchaProps) {
  if (!SITE_KEY) return null;
  return <TurnstileWidget {...props} siteKey={SITE_KEY} />;
}

function getInitialSize(): "normal" | "compact" {
  return window.matchMedia("(max-width: 640px)").matches ? "compact" : "normal";
}

function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
}: TurnstileCaptchaProps & { siteKey: string }) {
  // Lazy initializer reads matchMedia once synchronously so the widget renders
  // at the correct size on first paint — avoids a normal→compact re-render
  // on mobile that would reset the CAPTCHA challenge.
  const [size, setSize] = useState<"normal" | "compact">(getInitialSize);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e: MediaQueryListEvent) =>
      setSize(e.matches ? "compact" : "normal");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex justify-center">
      <Turnstile
        siteKey={siteKey}
        onSuccess={onVerify}
        onExpire={onExpire}
        onError={onError}
        options={{ theme: "auto", size }}
      />
    </div>
  );
}
