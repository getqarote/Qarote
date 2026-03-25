import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import {
  Book,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Zap,
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
import { PlanBadge } from "@/components/ui/PlanBadge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useToast } from "@/hooks/ui/useToast";

function HelpSupport() {
  const { t } = useTranslation("help");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { toast } = useToast();
  const { user: _user } = useAuth();

  const faqs = [
    {
      question: t("faqs.connectServer.question"),
      answer: t("faqs.connectServer.answer"),
    },
    {
      question: t("faqs.cantSeeQueues.question"),
      answer: t("faqs.cantSeeQueues.answer"),
    },
    {
      question: t("faqs.dataStorage.question"),
      answer: t("faqs.dataStorage.answer"),
    },
    {
      question: t("faqs.setupAlerts.question"),
      answer: t("faqs.setupAlerts.answer"),
    },
    {
      question: t("faqs.managePermissions.question"),
      answer: t("faqs.managePermissions.answer"),
    },
  ];

  const quickLinks = [
    {
      title: t("quickLinks.dashboard.title"),
      description: t("quickLinks.dashboard.description"),
      icon: Zap,
      link: "/",
      external: false,
    },
    {
      title: t("quickLinks.queueManagement.title"),
      description: t("quickLinks.queueManagement.description"),
      icon: MessageSquare,
      link: "/queues",
      external: false,
    },
    {
      title: t("quickLinks.rabbitMQDocs.title"),
      description: t("quickLinks.rabbitMQDocs.description"),
      icon: Book,
      link: "https://www.rabbitmq.com/documentation.html",
      external: true,
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

  const handleEmailClick = (e: React.MouseEvent) => {
    // For better UX, we'll always try mailto first
    // but provide a fallback copy option
    try {
      // The browser will handle this - no need to intercept
      // Just let the normal mailto: behavior work
    } catch {
      e.preventDefault();
      handleEmailCopy();
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
              <PlanBadge />
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              {/* Quick Help Links */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-foreground">
                    {t("quickLinksTitle")}
                  </h2>
                  <div className="grid gap-3">
                    {quickLinks.map((link, index) => {
                      const Icon = link.icon;

                      return (
                        <div key={index}>
                          {link.external ? (
                            <a
                              href={link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <Card className="border-0 shadow-md bg-card hover:shadow-lg transition-shadow cursor-pointer">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                      <h3 className="font-medium">
                                        {link.title}
                                      </h3>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {link.description}
                                      </p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                </CardContent>
                              </Card>
                            </a>
                          ) : (
                            <Link to={link.link} className="block">
                              <Card className="border-0 shadow-md bg-card hover:shadow-lg transition-shadow cursor-pointer">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                      <h3 className="font-medium">
                                        {link.title}
                                      </h3>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {link.description}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

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
                          onClick={handleEmailClick}
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
                    <DiscordLink userId={_user?.id} userEmail={_user?.email} />
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
