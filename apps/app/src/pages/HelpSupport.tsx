import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

import { isCloudMode } from "@/lib/featureFlags";

import { DiscordLink } from "@/components/DiscordLink";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { PixelEmail } from "@/components/ui/pixel-email";
import { PixelMessage } from "@/components/ui/pixel-message";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";

interface TawkAPI {
  maximize: () => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkAPI;
  }
}

function HelpSupport() {
  const { t } = useTranslation("help");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqQuery, setFaqQuery] = useState("");
  const { user } = useAuth();

  const faqs = useMemo(
    () => [
      {
        question: t("faqs.connectServer.question"),
        answer: t("faqs.connectServer.answer"),
      },
      {
        question: t("faqs.credentialsSecurity.question"),
        answer: t("faqs.credentialsSecurity.answer"),
      },
      {
        question: t("faqs.readOnly.question"),
        answer: t("faqs.readOnly.answer"),
      },
      {
        question: t("faqs.compatibility.question"),
        answer: t("faqs.compatibility.answer"),
      },
      {
        question: t("faqs.multipleServers.question"),
        answer: t("faqs.multipleServers.answer"),
      },
      {
        question: t("faqs.refreshRate.question"),
        answer: t("faqs.refreshRate.answer"),
      },
      {
        question: t("faqs.availability.question"),
        answer: t("faqs.availability.answer"),
      },
      {
        question: t("faqs.setupAlerts.question"),
        answer: t("faqs.setupAlerts.answer"),
      },
      {
        question: t("faqs.teamMembers.question"),
        answer: t("faqs.teamMembers.answer"),
      },
      {
        question: t("faqs.plans.question"),
        answer: t("faqs.plans.answer"),
      },
    ],
    [t]
  );

  const filteredFaqs = useMemo(() => {
    const query = faqQuery.trim().toLowerCase();
    if (!query) {
      return faqs.map((faq, index) => ({ ...faq, index }));
    }

    return faqs
      .map((faq, index) => ({ ...faq, index }))
      .filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      );
  }, [faqs, faqQuery]);

  const handleEmailCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText("support@qarote.io");
      toast(t("toast.emailCopied"), {
        description: t("toast.emailCopiedDescription"),
      });
    } catch {
      toast.error(t("toast.copyFailed"), {
        description: t("toast.copyFailedDescription"),
      });
    }
  };

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger />
          <div className="min-w-0">
            <h1 className="title-page">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Support Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PixelEmail className="h-5" />
                {t("contact.title")}
              </CardTitle>
              <CardDescription>{t("contact.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">
                  {t("contact.generalSupport")}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href="mailto:support@qarote.io?subject=Qarote Support Request"
                    className="text-sm text-info hover:underline hover:decoration-foreground"
                  >
                    support@qarote.io
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEmailCopy}
                    className="h-6 px-2"
                    aria-label={t("contact.copyEmailAria")}
                    title={t("contact.copyEmailAria")}
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  {t("contact.responseTime")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Live Chat - only shown in cloud mode where Tawk.to widget is mounted */}
          {isCloudMode() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PixelMessage className="h-5" />
                  {t("chat.title")}
                </CardTitle>
                <CardDescription>{t("chat.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="lg"
                  onClick={() => {
                    if (window.Tawk_API?.maximize) {
                      window.Tawk_API.maximize();
                    } else {
                      toast.error(t("chat.unavailable"));
                    }
                  }}
                  className="w-full bg-primary! text-primary-foreground! hover:bg-primary/90! shadow-sm ring-1 ring-primary/20"
                >
                  <PixelMessage className="h-4 mr-2" aria-hidden="true" />
                  {t("chat.startChat")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Community Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PixelMessage className="h-5" />
                {t("community.title")}
              </CardTitle>
              <CardDescription>{t("community.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <DiscordLink userId={user?.id} userEmail={user?.email} />
            </CardContent>
          </Card>
        </div>

        {/* Quick links + FAQ */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("quickLinksTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Link to="/" className="block">
                <div className="rounded-lg border border-border/60 bg-card p-3 hover:bg-accent/40 transition-colors">
                  <p className="text-sm font-medium text-foreground">
                    {t("quickLinks.dashboard.title")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("quickLinks.dashboard.description")}
                  </p>
                </div>
              </Link>
              <Link to="/queues" className="block">
                <div className="rounded-lg border border-border/60 bg-card p-3 hover:bg-accent/40 transition-colors">
                  <p className="text-sm font-medium text-foreground">
                    {t("quickLinks.queueManagement.title")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("quickLinks.queueManagement.description")}
                  </p>
                </div>
              </Link>
              <a
                href="https://www.rabbitmq.com/docs"
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <div className="rounded-lg border border-border/60 bg-card p-3 hover:bg-accent/40 transition-colors">
                  <p className="text-sm font-medium text-foreground">
                    {t("quickLinks.rabbitMQDocs.title")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("quickLinks.rabbitMQDocs.description")}
                  </p>
                </div>
              </a>
            </CardContent>
          </Card>

          <div>
            <div className="flex items-end justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-foreground">
                  {t("faqTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("faqSearchHint")}
                </p>
              </div>
              <Input
                value={faqQuery}
                onChange={(e) => {
                  setFaqQuery(e.target.value);
                  setOpenFaq(null);
                }}
                placeholder={t("faqSearchPlaceholder")}
                className="w-full sm:w-72"
              />
            </div>

            {filteredFaqs.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="font-medium text-foreground">
                    {t("faqNoResultsTitle")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("faqNoResultsDesc")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map((faq) => (
                  <Card key={faq.index}>
                    <Collapsible
                      open={openFaq === faq.index}
                      onOpenChange={(isOpen) =>
                        setOpenFaq(isOpen ? faq.index : null)
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between text-left h-auto p-4 hover:bg-accent"
                        >
                          <span className="font-medium">{faq.question}</span>
                          {openFaq === faq.index ? (
                            <ChevronDown
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronRight
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4 text-sm text-muted-foreground">
                        {faq.answer}
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default HelpSupport;
