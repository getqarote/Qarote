import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackSignUpClick } from "@/lib/gtm";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <div className="mt-[0.4rem] w-3.5 shrink-0 flex items-start">
      <img
        src="/images/check.svg"
        alt="Check"
        className="image-crisp w-auto h-[0.7rem]"
      />
    </div>
    <div className="flex-1 flex items-center gap-2">{children}</div>
  </li>
);

const PricingSection = () => {
  const { t: tPricing } = useTranslation("pricing");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [hostingMode, setHostingMode] = useState<"cloud" | "selfhost">("cloud");
  const cloudTabRef = useRef<HTMLButtonElement>(null);
  const selfhostTabRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeRef = hostingMode === "cloud" ? cloudTabRef : selfhostTabRef;
    if (activeRef.current) {
      setIndicatorStyle({
        left: activeRef.current.offsetLeft,
        width: activeRef.current.offsetWidth,
      });
    }
  }, [hostingMode]);

  // Init indicator on mount
  useEffect(() => {
    if (cloudTabRef.current) {
      setIndicatorStyle({
        left: cloudTabRef.current.offsetLeft,
        width: cloudTabRef.current.offsetWidth,
      });
    }
  }, []);

  const selfHostPricing: Record<
    string,
    { price: string; period?: string; ctaKey: string; url: string }
  > = {
    FREE: {
      price: "$0",
      ctaKey: "instructions",
      url: "https://github.com/getqarote/Qarote",
    },
    DEVELOPER: {
      price: "$348",
      period: "/ year",
      ctaKey: "chooseDeveloper",
      url: import.meta.env.VITE_PORTAL_URL,
    },
    ENTERPRISE: {
      price: "$1,188",
      period: "/ year",
      ctaKey: "chooseEnterprise",
      url: import.meta.env.VITE_PORTAL_URL,
    },
  };

  const planPricing = {
    monthly: {
      FREE: { price: "$0", originalPrice: undefined },
      DEVELOPER: { price: "$34", originalPrice: undefined },
      ENTERPRISE: { price: "$124", originalPrice: undefined },
    },
    yearly: {
      FREE: { price: "$0", originalPrice: undefined },
      DEVELOPER: { price: "$29", originalPrice: "$34" },
      ENTERPRISE: { price: "$99", originalPrice: "$124" },
    },
  };

  const plans = [
    {
      id: "FREE",
      name: tPricing("plans.starter.name"),
      description: tPricing("plans.starter.description"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-orange-200",
      features: {
        servers: "upTo1" as const,
        rabbitMQVersionSupport: tPricing("featureNames.onlyLTS"),
        workspaces: "upTo1" as const,
        teamMembers: "upTo1" as const,
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: false,
        communitySupport: true,
        prioritySupport: false,
        emailAlerts: false,
        topologyVisualization: false as false | "soon",
        roleBasedAccess: false as false | "soon",
      },
    },
    {
      id: "DEVELOPER",
      name: tPricing("plans.pro.name"),
      description: tPricing("plans.pro.description"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      isPopular: true,
      features: {
        servers: "upTo3" as const,
        rabbitMQVersionSupport: tPricing("featureNames.allVersions"),
        workspaces: "upTo3" as const,
        teamMembers: "upTo3" as const,
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: true,
        communitySupport: true,
        prioritySupport: true,
        emailAlerts: true,
        topologyVisualization: true,
        roleBasedAccess: "soon" as false | "soon",
      },
    },
    {
      id: "ENTERPRISE",
      name: tPricing("plans.business.name"),
      description: tPricing("plans.business.description"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: "unlimited" as const,
        rabbitMQVersionSupport: tPricing("featureNames.allVersions"),
        workspaces: "unlimited" as const,
        teamMembers: "unlimited" as const,
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: true,
        communitySupport: true,
        prioritySupport: true,
        emailAlerts: true,
        topologyVisualization: true,
        roleBasedAccess: "soon" as false | "soon",
      },
    },
  ];

  return (
    <section
      id="pricing"
      className="pt-12 pb-20"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
            {tPricing("title")}
          </h2>
        </div>

        {/* Hosting Tabs + Billing Toggle row */}
        <div className="flex flex-col sm:relative sm:flex-row items-center justify-center gap-4 sm:gap-0 mb-8 max-w-7xl mx-auto w-full">
          {/* Hosting Mode Tabs — centered */}
          <div className="relative flex border border-border p-1">
            {/* Sliding indicator */}
            <div
              className="absolute top-1 bottom-1 bg-foreground"
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
                transition: "left 200ms ease, width 200ms ease",
              }}
            />
            <button
              type="button"
              ref={cloudTabRef}
              onClick={() => setHostingMode("cloud")}
              className="relative z-10 flex flex-1 justify-center items-center gap-2 py-3 px-6 text-sm font-medium whitespace-nowrap"
              style={{
                color:
                  hostingMode === "cloud"
                    ? "hsl(var(--background))"
                    : "hsl(var(--foreground))",
                transition: "color 200ms ease",
              }}
            >
              <img src="/images/cloud.svg" alt="Cloud" className="w-4 h-4" />
              Cloud
            </button>
            <button
              type="button"
              ref={selfhostTabRef}
              onClick={() => setHostingMode("selfhost")}
              className="relative z-10 flex flex-1 justify-center items-center gap-2 py-3 px-6 text-sm font-medium whitespace-nowrap"
              style={{
                color:
                  hostingMode === "selfhost"
                    ? "hsl(var(--background))"
                    : "hsl(var(--foreground))",
                transition: "color 200ms ease",
              }}
            >
              <img src="/images/server.svg" alt="Server" className="w-4 h-4" />
              Self-host
            </button>
          </div>

          {/* Billing Toggle — right on desktop, centered on mobile */}
          <div
            className={`sm:absolute sm:right-0 flex items-center gap-3 ${hostingMode === "selfhost" ? "opacity-30 pointer-events-none" : ""}`}
          >
            <button
              type="button"
              onClick={() =>
                setBillingPeriod(
                  billingPeriod === "monthly" ? "yearly" : "monthly"
                )
              }
              data-state={billingPeriod === "yearly" ? "checked" : "unchecked"}
              className="relative inline-flex items-center transition-colors bg-muted data-[state=checked]:bg-gradient-button"
              style={{ width: "27px", height: "15px" }}
            >
              <span
                className="inline-block bg-white transition-transform"
                style={{
                  width: "9px",
                  height: "9px",
                  transform:
                    billingPeriod === "yearly"
                      ? "translateX(15px)"
                      : "translateX(3px)",
                }}
              />
            </button>
            <span
              className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
            >
              {tPricing("billedYearly")}
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="flex justify-center w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl">
            {plans.map((plan) => {
              const currentPricing =
                plan.id in planPricing[billingPeriod]
                  ? planPricing[billingPeriod][
                      plan.id as keyof typeof planPricing.monthly
                    ]
                  : null;
              const monthlyPricing =
                plan.id in planPricing.monthly
                  ? planPricing.monthly[
                      plan.id as keyof typeof planPricing.monthly
                    ]
                  : null;
              const yearlyPricing =
                plan.id in planPricing.yearly
                  ? planPricing.yearly[
                      plan.id as keyof typeof planPricing.yearly
                    ]
                  : null;
              const selfHost = selfHostPricing[plan.id] ?? null;
              return (
                <Card
                  key={plan.id}
                  className="relative flex h-full flex-col bg-transparent"
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    {hostingMode === "cloud" && plan.id === "DEVELOPER" && (
                      <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 border border-primary text-primary">
                        {tPricing("mostPopular")}
                      </span>
                    )}
                    {hostingMode === "cloud" && plan.id === "ENTERPRISE" && (
                      <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 border border-primary text-primary">
                        {tPricing("freeTrial")}
                      </span>
                    )}
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className={`text-2xl font-normal ${plan.color}`}>
                          {plan.name}
                        </h3>
                      </div>

                      <div className="mb-2 flex flex-col justify-start min-h-[90px]">
                        {hostingMode === "selfhost" && selfHost ? (
                          <div className="flex items-center justify-start gap-4">
                            <span className="text-5xl font-medium text-foreground">
                              {selfHost.price}
                            </span>
                            {selfHost.period && (
                              <span className="text-sm text-muted-foreground">
                                {selfHost.period}
                              </span>
                            )}
                          </div>
                        ) : currentPricing ? (
                          <>
                            <div className="flex items-center justify-start gap-4">
                              <span className="text-5xl font-medium text-foreground">
                                {currentPricing.price}
                              </span>
                              {currentPricing.price !== "$0" && (
                                <div className="flex flex-col leading-tight">
                                  <span className="text-sm text-muted-foreground">
                                    {tPricing("perMonth")}
                                  </span>
                                  {billingPeriod === "yearly" && (
                                    <span className="text-sm text-muted-foreground">
                                      {tPricing("billedYearly")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {billingPeriod === "yearly" &&
                              monthlyPricing &&
                              monthlyPricing.price !== "$0" && (
                                <span className="text-sm text-muted-foreground mt-4">
                                  <span className="font-medium text-foreground">
                                    {monthlyPricing.price}
                                  </span>{" "}
                                  {tPricing("billedMonthly")}
                                </span>
                              )}
                            {billingPeriod === "monthly" &&
                              yearlyPricing &&
                              yearlyPricing.price !== "$0" && (
                                <span className="text-sm text-muted-foreground mt-4">
                                  <span className="font-medium text-foreground">
                                    {yearlyPricing.price}
                                  </span>{" "}
                                  {tPricing("billedYearly")}
                                </span>
                              )}
                          </>
                        ) : (
                          <div className="flex items-center justify-start gap-2">
                            <span className="text-xl font-semibold text-foreground">
                              {tPricing("contactSales")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <hr className="border-border mt-4 mb-8" />

                    <div className="space-y-6 flex-1">
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
                          {tPricing("coreFeatures")}
                        </h4>
                        <ul className="space-y-2">
                          <FeatureItem>
                            <span className="text-sm text-foreground">
                              {tPricing(
                                `featureNames.server_${plan.features.servers}`
                              )}
                            </span>
                          </FeatureItem>
                          <FeatureItem>
                            <span className="text-sm text-foreground">
                              {tPricing(
                                `featureNames.workspace_${plan.features.workspaces}`
                              )}
                            </span>
                          </FeatureItem>
                          <FeatureItem>
                            <span className="text-sm text-foreground">
                              {tPricing(
                                `featureNames.member_${plan.features.teamMembers}`
                              )}
                            </span>
                          </FeatureItem>
                          <FeatureItem>
                            <span className="text-sm text-foreground">
                              {tPricing("featureNames.advancedAnalytics")}
                            </span>
                          </FeatureItem>
                          {plan.features.queueManagement && (
                            <FeatureItem>
                              <span className="text-sm text-foreground">
                                {tPricing(
                                  "featureNames.queueExchangeManagement"
                                )}
                              </span>
                            </FeatureItem>
                          )}
                          {plan.features.alertsNotification && (
                            <FeatureItem>
                              <span className="text-sm text-foreground">
                                {tPricing("featureNames.alertsWebhooks")}
                              </span>
                            </FeatureItem>
                          )}
                          {plan.features.topologyVisualization && (
                            <FeatureItem>
                              <span className="text-sm text-foreground">
                                {tPricing("featureNames.topologyVisualization")}
                              </span>
                              {plan.features.topologyVisualization ===
                                "soon" && (
                                <span
                                  className="font-medium px-1 border border-border text-muted-foreground"
                                  style={{ fontSize: "0.65rem" }}
                                >
                                  {tPricing("soon")}
                                </span>
                              )}
                            </FeatureItem>
                          )}
                          {plan.features.roleBasedAccess && (
                            <FeatureItem>
                              <span className="text-sm text-foreground">
                                {tPricing("featureNames.roleBasedAccess")}
                              </span>
                              {plan.features.roleBasedAccess === "soon" && (
                                <span
                                  className="font-medium px-1 border border-border text-muted-foreground"
                                  style={{ fontSize: "0.65rem" }}
                                >
                                  {tPricing("soon")}
                                </span>
                              )}
                            </FeatureItem>
                          )}
                        </ul>
                      </div>

                      <div className="mt-auto space-y-4">
                        <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                          {tPricing("securityCompatibility")}
                        </h4>
                        <ul className="space-y-2">
                          {plan.id === "ENTERPRISE" && (
                            <FeatureItem>
                              <span className="text-sm text-foreground">
                                {tPricing("featureNames.ssoSamlOidc")}
                              </span>
                            </FeatureItem>
                          )}
                          <FeatureItem>
                            <span className="text-sm text-foreground">
                              {tPricing("featureNames.soc2Compliance")}
                            </span>
                          </FeatureItem>
                          {plan.features.servers === "upTo1" && (
                            <FeatureItem>
                              <div>
                                <span className="text-sm text-foreground">
                                  {tPricing("featureNames.ltsVersions")}
                                </span>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tPricing("featureNames.allLtsVersions")}
                                </p>
                              </div>
                            </FeatureItem>
                          )}
                          {plan.features.servers !== "upTo1" && (
                            <FeatureItem>
                              <div>
                                <span className="text-sm text-foreground">
                                  {tPricing("featureNames.allRabbitMQVersions")}
                                </span>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tPricing("featureNames.allVersions")}
                                </p>
                              </div>
                            </FeatureItem>
                          )}
                        </ul>
                      </div>

                      <div className="mt-auto space-y-4">
                        <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                          {tPricing("support")}
                        </h4>
                        <ul className="space-y-2">
                          <FeatureItem>
                            <span className="text-sm text-foreground">
                              {tPricing("featureNames.communitySupport")}
                            </span>
                          </FeatureItem>
                          {plan.features.prioritySupport && (
                            <FeatureItem>
                              <span className="text-sm text-foreground">
                                {tPricing("featureNames.prioritySupport")}
                              </span>
                            </FeatureItem>
                          )}
                        </ul>
                      </div>
                    </div>
                    <Button
                      className={`w-full mt-6 px-4 py-3 sm:px-7 sm:py-3 transition-colors duration-200 text-base sm:text-lg h-auto rounded-full ${plan.id === "FREE" ? "bg-transparent border border-border text-foreground hover:bg-muted" : "bg-gradient-button hover:bg-gradient-button-hover text-white"}`}
                      onClick={() => {
                        if (hostingMode === "selfhost" && selfHost?.url) {
                          window.open(selfHost.url, "_blank");
                        } else {
                          const appBaseUrl = import.meta.env.VITE_APP_BASE_URL;

                          const token =
                            localStorage.getItem("authToken") ||
                            document.cookie
                              .split(";")
                              .find((c) => c.trim().startsWith("authToken="));

                          if (token) {
                            window.location.href = `${appBaseUrl}/plans`;
                          } else {
                            trackSignUpClick({
                              source: "pricing_card",
                              location: "landing_page",
                            });
                            window.location.href = `${appBaseUrl}/auth/sign-up`;
                          }
                        }
                      }}
                    >
                      {hostingMode === "selfhost" && selfHost
                        ? tPricing(selfHost.ctaKey)
                        : plan.id === "FREE" || plan.id === "DEVELOPER"
                          ? tPricing("getStarted")
                          : plan.id === "ENTERPRISE"
                            ? tPricing("tryNowForFree")
                            : tPricing("startFree")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
