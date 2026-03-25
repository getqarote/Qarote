import { useState } from "react";
import { useTranslation } from "react-i18next";

interface TawkAPI {
  maximize: () => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkAPI;
  }
}

import {
  ChevronDown,
  ChevronRight,
  Copy,
  Mail,
  MessageCircle,
  MessageSquare,
} from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { DiscordLink } from "@/components/DiscordLink";
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
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useToast } from "@/hooks/ui/useToast";

function HelpSupport() {
  const { t } = useTranslation("help");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const faqs = [
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
  ];

  const handleEmailCopy = async () => {
    try {
      await navigator.clipboard.writeText("support@qarote.io");
      toast({
        title: t("toast.emailCopied"),
        description: t("toast.emailCopiedDescription"),
      });
    } catch {
      toast({
        title: t("toast.copyFailed"),
        description: t("toast.copyFailedDescription"),
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="content-container-large">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="title-page">{t("title")}</h1>
                  <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              {/* Support Options */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contact */}
                <Card className="border-0 shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      {t("contact.title")}
                    </CardTitle>
                    <CardDescription>
                      {t("contact.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">
                        {t("contact.generalSupport")}
                      </p>
                      <div className="flex items-center gap-2">
                        <a
                          href="mailto:support@qarote.io?subject=Qarote Support Request"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          support@qarote.io
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEmailCopy}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
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

                {/* Live Chat */}
                <Card className="border-0 shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      {t("chat.title")}
                    </CardTitle>
                    <CardDescription>{t("chat.description")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => {
                        if (window.Tawk_API?.maximize) {
                          window.Tawk_API.maximize();
                        } else {
                          toast({
                            title: t("chat.unavailable"),
                            variant: "destructive",
                          });
                        }
                      }}
                      className="w-full bg-gradient-button hover:bg-gradient-button-hover text-white"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t("chat.startChat")}
                    </Button>
                  </CardContent>
                </Card>

                {/* Community Support */}
                <Card className="border-0 shadow-md bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      {t("community.title")}
                    </CardTitle>
                    <CardDescription>
                      {t("community.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DiscordLink userId={user?.id} userEmail={user?.email} />
                  </CardContent>
                </Card>
              </div>

              {/* FAQ Section */}
              <div className="lg:col-span-3 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-foreground">
                    {t("faqTitle")}
                  </h2>
                  <div className="space-y-3">
                    {faqs.map((faq, index) => (
                      <Card key={index} className="border-0 shadow-md bg-card">
                        <Collapsible
                          open={openFaq === index}
                          onOpenChange={(isOpen) =>
                            setOpenFaq(isOpen ? index : null)
                          }
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between text-left h-auto p-4 hover:bg-accent"
                            >
                              <span className="font-medium">
                                {faq.question}
                              </span>
                              {openFaq === index ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
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
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default HelpSupport;
