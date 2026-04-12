import { useTranslation } from "react-i18next";

const ComparisonPoint = ({ icon, text }: { icon: string; text: string }) => (
  <div className="flex gap-4 items-center">
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

const ComparisonSection = () => {
  const { t } = useTranslation("landing");

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

        {/* Main Comparison Container */}
        <div className="border border-border overflow-hidden">
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
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point2")}
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point3")}
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point4")}
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
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point2")}
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point3")}
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point4")}
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
                  <div className="bg-background p-4 space-y-3">
                    {/* Metric strip — mirrors the app dashboard */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-border p-2.5">
                        <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                          {t("comparison.messagesPerSec")}
                        </div>
                        <div className="text-base font-mono text-foreground">
                          4.2k
                        </div>
                      </div>
                      <div className="border border-border p-2.5">
                        <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                          {t("comparison.activeQueues")}
                        </div>
                        <div className="text-base font-mono text-foreground">
                          127
                        </div>
                      </div>
                    </div>
                    {/* Status bar */}
                    <div className="border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 flex items-center gap-2">
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
