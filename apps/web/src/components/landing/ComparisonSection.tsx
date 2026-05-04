import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useScrollEntry<T extends Element>(
  threshold = 0.1
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, entered];
}

const ComparisonPoint = ({
  icon,
  text,
  entered,
  delay,
  reduceMotion,
}: {
  icon: string;
  text: string;
  entered: boolean;
  delay: number;
  reduceMotion: boolean;
}) => {
  const style: CSSProperties = reduceMotion
    ? {}
    : {
        opacity: entered ? 1 : 0,
        transform: entered ? "none" : "translateX(-6px)",
        transition: `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      };

  return (
    <div className="flex gap-4 items-center" style={style}>
      <img
        src={`/images/${icon}.svg`}
        alt=""
        aria-hidden="true"
        className="h-3 shrink-0 w-auto image-crisp"
        width={12}
        height={12}
      />
      <p className="text-foreground">{text}</p>
    </div>
  );
};

const ComparisonSection = () => {
  const { t } = useTranslation("landing");
  const reduceMotion = useReducedMotion();
  const [containerRef, containerEntered] = useScrollEntry<HTMLDivElement>(0.08);

  return (
    <section className="pb-20 bg-background pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
            {t("comparison.title")}
            <span className="hidden md:inline">
              <br />
            </span>{" "}
            {t("comparison.titleLine2")}
          </h2>
        </div>

        {/* Compare links */}
        <nav
          aria-label={t("comparison.compareWith")}
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10 text-sm text-muted-foreground"
        >
          <span aria-hidden="true">{t("comparison.compareWith")}</span>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 list-none">
            <li>
              <a
                href="/compare/datadog/"
                className="text-primary hover:underline"
              >
                {t("footer.vsDatadog")}
              </a>
            </li>
            <li>
              <a
                href="/compare/grafana-prometheus/"
                className="text-primary hover:underline"
              >
                {t("footer.vsGrafana")}
              </a>
            </li>
            <li>
              <a
                href="/compare/cloudamqp/"
                className="text-primary hover:underline"
              >
                {t("footer.vsCloudAMQP")}
              </a>
            </li>
            <li>
              <a
                href="/compare/new-relic/"
                className="text-primary hover:underline"
              >
                {t("footer.vsNewRelic")}
              </a>
            </li>
          </ul>
        </nav>

        {/* Main Comparison Container */}
        <div
          ref={containerRef}
          className="border border-border overflow-hidden"
        >
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left Column - Traditional */}
            <div className="flex flex-col">
              <div className="px-8 lg:px-12 py-3 bg-muted/30 border-b border-border">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("comparison.traditional.title")}
                </h3>
              </div>
              <div className="px-8 lg:px-12 pt-8 pb-0 flex flex-col flex-1">
                <div className="space-y-5 mb-16">
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point1")}
                    entered={containerEntered}
                    delay={0}
                    reduceMotion={reduceMotion}
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point2")}
                    entered={containerEntered}
                    delay={50}
                    reduceMotion={reduceMotion}
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point3")}
                    entered={containerEntered}
                    delay={100}
                    reduceMotion={reduceMotion}
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point4")}
                    entered={containerEntered}
                    delay={150}
                    reduceMotion={reduceMotion}
                  />
                </div>

                {/* Visual Representation - Simple/Outdated */}
                <div className="border border-border mt-auto overflow-hidden">
                  <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-400" />
                    <div className="w-2.5 h-2.5 bg-yellow-400" />
                    <div className="w-2.5 h-2.5 bg-green-400" />
                    <span className="text-xs text-muted-foreground ml-2">
                      management.local:15672
                    </span>
                  </div>
                  <div className="bg-background p-6 flex items-center justify-center h-[160px]">
                    <img
                      src="/images/error.svg"
                      alt=""
                      aria-hidden="true"
                      className="w-12 h-12 image-crisp"
                      width={48}
                      height={48}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Qarote */}
            <div className="flex flex-col">
              <div className="px-8 lg:px-12 py-3 bg-muted/30 border-b border-border">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("comparison.qarote.title")}
                </h3>
              </div>
              <div className="px-8 lg:px-12 pt-8 pb-0 flex flex-col flex-1">
                <div className="space-y-5 mb-16">
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point1")}
                    entered={containerEntered}
                    delay={80}
                    reduceMotion={reduceMotion}
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point2")}
                    entered={containerEntered}
                    delay={130}
                    reduceMotion={reduceMotion}
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point3")}
                    entered={containerEntered}
                    delay={180}
                    reduceMotion={reduceMotion}
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point4")}
                    entered={containerEntered}
                    delay={230}
                    reduceMotion={reduceMotion}
                  />
                </div>

                {/* Visual Representation - Qarote Dashboard mock */}
                <div className="border border-border mt-auto overflow-hidden">
                  <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
                    <img
                      src="/images/new_icon.svg"
                      alt=""
                      aria-hidden="true"
                      className="w-4 h-4"
                      width={16}
                      height={16}
                    />
                    <span className="text-xs font-medium text-foreground">
                      Qarote
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Dashboard
                    </span>
                  </div>
                  <div className="bg-background divide-y divide-border">
                    {/* Queue list — distinct from metrics panels elsewhere */}
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-foreground">
                        orders.process
                      </span>
                      <span className="text-xs font-mono text-status-success-text">
                        0 ready
                      </span>
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-foreground">
                        email.notifications
                      </span>
                      <span className="text-xs font-mono text-status-success-text">
                        3 ready
                      </span>
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-foreground">
                        analytics.events
                      </span>
                      <span className="text-xs font-mono text-status-success-text">
                        12 ready
                      </span>
                    </div>
                    {/* Status bar */}
                    <div className="bg-status-success-bg px-3 py-2 text-xs text-status-success-text flex items-center gap-2">
                      <img
                        src="/images/check.svg"
                        alt=""
                        aria-hidden="true"
                        className="shrink-0 w-auto h-[0.525rem] image-crisp"
                        width={10}
                        height={8}
                      />
                      {t("comparison.allSystemsOperational")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
