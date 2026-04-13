import { useTranslation } from "react-i18next";

const ConnectionSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section className="pt-12 pb-20 bg-muted/20">
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
            <div className="border border-border overflow-hidden">
              <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center gap-4">
                <span className="w-8 h-8 flex items-center justify-center bg-feature-icon-bg text-sm font-mono text-primary">
                  1
                </span>
                <h3 className="text-lg text-foreground font-normal">
                  {t("connection.step1.title")}
                </h3>
              </div>
              <div className="p-6">
                <p className="text-muted-foreground mb-6">
                  {t("connection.step1.description")}
                </p>
                {/* Sign-up mock — mirrors app auth UI */}
                <div className="border border-border overflow-hidden max-w-sm mx-auto">
                  <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                    <h4 className="text-sm font-medium text-foreground text-center">
                      {t("connection.step1.createAccount")}
                    </h4>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground text-center mb-4">
                      {t("connection.step1.transformMonitoring")}
                    </p>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `${import.meta.env.VITE_APP_BASE_URL}/auth/sign-up`;
                        }}
                        className="w-full bg-background border border-border p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <img
                          src="/images/email.svg"
                          alt=""
                          aria-hidden="true"
                          width="14"
                          height="14"
                          className="image-crisp w-auto h-3.5"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {t("connection.step1.continueWithEmail")}
                        </span>
                      </button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            {t("connection.step1.or")}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `${import.meta.env.VITE_APP_BASE_URL}/auth/sign-up`;
                        }}
                        className="w-full bg-background border border-border p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <img
                          src="/images/google.svg"
                          alt=""
                          aria-hidden="true"
                          width="14"
                          height="14"
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
            </div>

            {/* Step 2: Add your servers */}
            <div className="border border-border overflow-hidden">
              <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center gap-4">
                <span className="w-8 h-8 flex items-center justify-center bg-feature-icon-bg text-sm font-mono text-primary">
                  2
                </span>
                <h3 className="text-lg text-foreground font-normal">
                  {t("connection.step2.title")}
                </h3>
              </div>
              <div className="p-6">
                <p className="text-muted-foreground mb-6">
                  {t("connection.step2.description")}
                </p>
                {/* Server list mock — mirrors app server sidebar */}
                <div className="border border-border overflow-hidden max-w-sm mx-auto">
                  <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Servers
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src="/images/server.svg"
                          alt=""
                          aria-hidden="true"
                          width="20"
                          height="20"
                          className="w-5 h-5 image-crisp"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground">
                          {t("connection.step2.productionServer")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("connection.step2.nodes")}
                        </div>
                      </div>
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Online
                      </div>
                    </div>
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src="/images/server.svg"
                          alt=""
                          aria-hidden="true"
                          width="20"
                          height="20"
                          className="w-5 h-5 image-crisp"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground">
                          {t("connection.step2.stagingServer")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("connection.step2.nodes")}
                        </div>
                      </div>
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Online
                      </div>
                    </div>
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src="/images/server.svg"
                          alt=""
                          aria-hidden="true"
                          width="20"
                          height="20"
                          className="w-5 h-5 image-crisp"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground">
                          {t("connection.step2.developmentServer")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("connection.step2.nodes")}
                        </div>
                      </div>
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Online
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Monitor and collaborate */}
            <div className="border border-border overflow-hidden">
              <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center gap-4">
                <span className="w-8 h-8 flex items-center justify-center bg-feature-icon-bg text-sm font-mono text-primary">
                  3
                </span>
                <h3 className="text-lg text-foreground font-normal">
                  {t("connection.step3.title")}
                </h3>
              </div>
              <div className="p-6">
                <p className="text-muted-foreground mb-6">
                  {t("connection.step3.description")}
                </p>
                {/* Activity feed mock — shows team collaboration */}
                <div className="border border-border overflow-hidden max-w-sm mx-auto">
                  <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                    <img
                      src="/images/new_icon.svg"
                      alt=""
                      aria-hidden="true"
                      className="w-4 h-4"
                      width={16}
                      height={16}
                    />
                    <span className="text-xs font-medium text-foreground">
                      Activity
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="px-4 py-3 flex items-start gap-3">
                      <span className="mt-0.5 w-2 h-2 rounded-full bg-status-warning-text shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-foreground">
                          Queue backlog detected
                        </div>
                        <div className="text-xs text-muted-foreground">
                          orders.process — 12k messages · 2m ago
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-start gap-3">
                      <span className="mt-0.5 w-2 h-2 rounded-full bg-status-success-text shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-foreground">
                          Backlog resolved
                        </div>
                        <div className="text-xs text-muted-foreground">
                          orders.process — 0 messages · 45s ago
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-start gap-3">
                      <span className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-foreground">
                          New server added
                        </div>
                        <div className="text-xs text-muted-foreground">
                          staging-eu-west · 3 nodes · just now
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Status bar */}
                  <div className="border-t border-status-success-border bg-status-success-bg px-3 py-2 text-xs text-status-success-text flex items-center gap-2">
                    <img
                      src="/images/check.svg"
                      alt=""
                      aria-hidden="true"
                      width="11"
                      height="11"
                      className="image-crisp w-auto h-[0.7rem]"
                    />
                    <span>{t("connection.step3.allSystemsOperational")}</span>
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
