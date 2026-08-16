import { useEffect, useRef, useState } from "react";

interface DelayedLoadingOptions {
  /** Wait this long before showing a skeleton — fast loads never flash. */
  delay?: number;
  /** Once shown, keep the skeleton visible at least this long — no blink-out. */
  minVisible?: number;
}

/**
 * Anti-flash loading gate. Given a raw `loading` boolean, returns `true` only
 * after `delay` ms (so sub-180ms loads never paint a skeleton) and, once shown,
 * holds the skeleton for at least `minVisible` ms (so it never flickers out the
 * instant data arrives). Mirrors the prototype `useDelayedLoading` (skeletons.jsx).
 */
export function useDelayedLoading(
  loading: boolean,
  { delay = 180, minVisible = 400 }: DelayedLoadingOptions = {}
): boolean {
  const [show, setShow] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) {
      timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShow(true);
      }, delay);
    } else if (show) {
      const elapsed = Date.now() - shownAt.current;
      timer = setTimeout(
        () => setShow(false),
        Math.max(0, minVisible - elapsed)
      );
    }
    return () => clearTimeout(timer);
    // `show` is intentionally omitted: re-running on its own flip would restart
    // the min-visible timer mid-fade. The gate is driven by `loading` only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, delay, minVisible]);

  return show;
}
