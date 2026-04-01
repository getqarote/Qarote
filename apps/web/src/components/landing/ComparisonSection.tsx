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
    <section className="pb-20 bg-white pt-10">
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
        <div className="bg-transparent  border border-border overflow-hidden">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left Column - Traditional */}
            <div className="pt-8 lg:pt-12 px-8 lg:px-12 pb-0 flex flex-col relative overflow-visible">
              <h3 className="text-2xl text-foreground mb-8 font-normal">
                {t("comparison.traditional.title")}
              </h3>
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
              <div className="bg-card  border-t border-l border-r border-border p-4 mt-auto flex flex-col h-[200px] shadow-soft">
                <div className="flex gap-2 mb-3">
                  <div className="w-3 h-3 bg-red-400 "></div>
                  <div className="w-3 h-3 bg-yellow-400 "></div>
                  <div className="w-3 h-3 bg-green-400 "></div>
                </div>
                <div className="bg-background rounded flex-1 flex items-center justify-center">
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

            {/* Right Column - Qarote */}
            <div className="pt-8 lg:pt-12 px-8 lg:px-12 pb-0 flex flex-col relative overflow-visible">
              <h3 className="text-2xl text-foreground mb-8 font-normal">
                {t("comparison.qarote.title")}
              </h3>
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

              {/* Visual Representation - Modern Dashboard */}
              <div className="bg-card  border-t border-l border-r border-border p-4 mt-auto flex flex-col overflow-hidden h-[200px] shadow-soft">
                <div className="flex gap-2 mb-3">
                  <div className="w-3 h-3 bg-red-400 "></div>
                  <div className="w-3 h-3 bg-yellow-400 "></div>
                  <div className="w-3 h-3 bg-green-400 "></div>
                </div>
                <div className="bg-background p-3 space-y-2 flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                  <div className="flex items-center gap-1">
                    <img
                      src="/images/new_icon.svg"
                      alt=""
                      aria-hidden="true"
                      className="w-6 h-6"
                      width={24}
                      height={24}
                    />
                    <span className="font-semibold text-sm">Qarote</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/30 p-1.5">
                      <div className="text-xs text-muted-foreground">
                        {t("comparison.messagesPerSec")}
                      </div>
                      <div className="text-sm">4.2k</div>
                    </div>
                    <div className="bg-muted/30 p-1.5">
                      <div className="text-xs text-muted-foreground">
                        {t("comparison.activeQueues")}
                      </div>
                      <div className="text-sm">127</div>
                    </div>
                  </div>
                  <div className="bg-green-100 border border-green-200 p-1.5 text-xs text-green-700 flex items-center gap-1.5">
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
    </section>
  );
};

export default ComparisonSection;
