import { useTranslation } from "react-i18next";

const ConnectionSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section className="pt-12 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left side - Title and description */}
          <div className="lg:sticky lg:top-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-6 max-w-4xl leading-[1.2] font-normal">
              {t("connection.title")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("connection.subtitle")}
            </p>
          </div>

          {/* Right side - Steps */}
          <div className="space-y-8">
            {/* Step 1: Sign up */}
            <div className="bg-transparent border border-border  pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible">
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 flex items-center justify-center bg-orange-100">
                    <span className="text-xl text-primary">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl text-foreground mb-2 font-normal">
                    {t("connection.step1.title")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("connection.step1.description")}
                  </p>
                </div>
              </div>
              <div className="mt-auto">
                <div className="bg-card border-t border-l border-r border-border  p-6 max-w-sm mx-auto">
                  <h4 className="text-lg text-foreground text-center mb-2">
                    {t("connection.step1.createAccount")}
                  </h4>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    {t("connection.step1.transformMonitoring")}
                  </p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `${import.meta.env.VITE_APP_BASE_URL}/auth/sign-up`;
                      }}
                      className="w-full bg-background border border-border  p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                    >
                      <img
                        src="/images/email.svg"
                        alt="Email"
                        className="image-crisp w-auto h-3.5"
                      />
                      <span className="text-sm font-medium text-foreground">
                        {t("connection.step1.continueWithEmail")}
                      </span>
                    </button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          {t("connection.step1.or")}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `${import.meta.env.VITE_APP_BASE_URL}/auth/sign-up`;
                      }}
                      className="w-full bg-background border border-border  p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                    >
                      <img
                        src="/images/google.svg"
                        alt="Google"
                        className="image-crisp w-auto h-3.5"
                      />
                      <span className="text-sm font-medium text-foreground">
                        {t("connection.step1.continueWithGoogle")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Add your servers */}
            <div className="bg-transparent border border-border  pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible">
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 flex items-center justify-center bg-orange-100">
                    <span className="text-xl text-primary">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl text-foreground mb-2 font-normal">
                    {t("connection.step2.title")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("connection.step2.description")}
                  </p>
                </div>
              </div>
              <div className="mt-auto">
                <div className="bg-card border-t border-l border-r border-border  p-6 max-w-sm mx-auto">
                  <div className="space-y-3">
                    <div className="bg-background border border-border  p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src="/images/server.svg"
                          alt="Server"
                          className="w-6 h-6 image-crisp"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-foreground mb-0.5">
                          {t("connection.step2.productionServer")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("connection.step2.nodes")}
                        </div>
                      </div>
                    </div>
                    <div className="bg-background border border-border  p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src="/images/server.svg"
                          alt="Server"
                          className="w-6 h-6 image-crisp"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-foreground mb-0.5">
                          {t("connection.step2.stagingServer")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("connection.step2.nodes")}
                        </div>
                      </div>
                    </div>
                    <div className="bg-background border border-border  p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src="/images/server.svg"
                          alt="Server"
                          className="w-6 h-6 image-crisp"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-foreground mb-0.5">
                          {t("connection.step2.developmentServer")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("connection.step2.nodes")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Monitor and collaborate */}
            <div className="bg-transparent border border-border  pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible">
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 flex items-center justify-center bg-orange-100">
                    <span className="text-xl text-primary">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl text-foreground mb-2 font-normal">
                    {t("connection.step3.title")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("connection.step3.description")}
                  </p>
                </div>
              </div>
              <div className="mt-auto">
                <div className="bg-card border-t border-l border-r border-border  p-6 max-w-sm mx-auto">
                  <div className="space-y-4">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background border border-border  p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            {t("connection.step3.messagesPerSec")}
                          </span>
                        </div>
                        <div className="text-lg text-foreground">4.2k</div>
                      </div>
                      <div className="bg-background border border-border  p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            {t("connection.step3.queues")}
                          </span>
                        </div>
                        <div className="text-lg text-foreground">127</div>
                      </div>
                    </div>

                    {/* Chart Card */}
                    <div className="bg-background border border-border  p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-foreground">
                          {t("connection.step3.queueDepths")}
                        </span>
                      </div>
                      <div className="h-20 bg-muted/30 flex items-end justify-between gap-1 p-2">
                        <div className="flex-1 bg-primary h-[40%]"></div>
                        <div className="flex-1 bg-primary h-[60%]"></div>
                        <div className="flex-1 bg-primary h-[45%]"></div>
                        <div className="flex-1 bg-primary h-[75%]"></div>
                        <div className="flex-1 bg-primary h-[55%]"></div>
                        <div className="flex-1 bg-primary h-[80%]"></div>
                        <div className="flex-1 bg-primary h-[65%]"></div>
                      </div>
                    </div>

                    {/* Queue Status Card */}
                    <div className="bg-background border border-border  p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src="/images/check.svg"
                            alt=""
                            aria-hidden="true"
                            className="image-crisp w-auto h-[0.7rem]"
                          />
                          <span className="text-sm text-foreground">
                            {t("connection.step3.allSystemsOperational")}
                          </span>
                        </div>
                      </div>
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

export default ConnectionSection;
