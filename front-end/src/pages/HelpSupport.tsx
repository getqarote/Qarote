import { useState } from "react";
import {
  HelpCircle,
  MessageSquare,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Mail,
  Book,
  Zap,
  Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useToast } from "@/hooks/useToast";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const faqs = [
  {
    question: "How do I connect to my RabbitMQ server?",
    answer:
      "Go to the Dashboard and look for the server selector or 'Add Server' option. Enter your RabbitMQ connection details including host, port, username, and password. You can test the connection before saving.",
  },
  {
    question: "Why can't I see my queues?",
    answer:
      "Make sure your RabbitMQ server is running and accessible. Check that your user has the necessary permissions to view queues. You can test the connection from the Dashboard or by selecting a different server from the server dropdown.",
  },
  {
    question: "How do I browse messages in a queue?",
    answer:
      "Navigate to a queue and click the 'Browse Messages' button. You can specify how many messages to retrieve and choose the acknowledgment mode.",
  },
  {
    question: "What data does the dashboard store?",
    answer:
      "By default, the dashboard operates in real-time mode with no persistent storage. You can enable data storage in Privacy Settings if you want to keep historical data.",
  },
  {
    question: "How do I set up alerts?",
    answer:
      "Go to the Alerts page and create alert rules based on queue metrics like message count, consumer count, or memory usage. You can set thresholds and notification preferences.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Yes, if you have data storage enabled, administrators can export all workspace data from the Privacy Settings page.",
  },
  {
    question: "How do I manage user permissions?",
    answer:
      "Workspace administrators can manage user roles and permissions from the Users page. Different roles have different levels of access to features and data.",
  },
  {
    question: "Is my RabbitMQ data secure?",
    answer:
      "Yes, all data is encrypted in transit and at rest using AES-256 encryption. We never share your data with third parties and you have full control over data retention.",
  },
];

const quickLinks = [
  {
    title: "Dashboard & Servers",
    description: "View overview and manage your RabbitMQ server connections",
    icon: Zap,
    link: "/",
    external: false,
  },
  {
    title: "Queue Management",
    description: "View and manage your RabbitMQ queues",
    icon: MessageSquare,
    link: "/queues",
    external: false,
  },
  {
    title: "Privacy Settings",
    description: "Manage your data privacy and retention settings",
    icon: FileText,
    link: "/privacy-settings",
    external: false,
  },
  {
    title: "RabbitMQ Documentation",
    description: "Official RabbitMQ documentation and guides",
    icon: Book,
    link: "https://www.rabbitmq.com/documentation.html",
    external: true,
  },
];

export function HelpSupport() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { toast } = useToast();

  const handleEmailCopy = async () => {
    try {
      await navigator.clipboard.writeText("support@rabbithq.io");
      toast({
        title: "Email copied!",
        description: "support@rabbithq.io has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy: support@rabbithq.io",
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
    } catch (error) {
      e.preventDefault();
      handleEmailCopy();
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex flex-1 items-center gap-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Help & Support</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              <h1 className="text-3xl font-bold">Help & Support</h1>
            </div>
            <p className="text-gray-600">
              Find answers to common questions, submit feedback, or get help
              with the RabbitMQ Dashboard.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Quick Help Links */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
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
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                                  <div className="flex-1">
                                    <h3 className="font-medium">
                                      {link.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {link.description}
                                    </p>
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </div>
                              </CardContent>
                            </Card>
                          </a>
                        ) : (
                          <Link to={link.link} className="block">
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                                  <div className="flex-1">
                                    <h3 className="font-medium">
                                      {link.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Contact Support
                  </CardTitle>
                  <CardDescription>
                    Need personalized help? Reach out to our support team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">General Support</p>
                    <div className="flex items-center gap-2">
                      <a
                        href="mailto:support@rabbithq.io?subject=RabbitHQ Support Request"
                        className="text-sm text-blue-600 hover:text-blue-700"
                        onClick={handleEmailClick}
                      >
                        support@rabbithq.io
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
                    <p className="text-xs text-gray-500">
                      We typically respond within 24 hours during business days.
                      Can't open your email client? Use the copy button to get
                      our email address.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Section */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-2">
                  {faqs.map((faq, index) => (
                    <Collapsible
                      key={index}
                      open={openFaq === index}
                      onOpenChange={(isOpen) =>
                        setOpenFaq(isOpen ? index : null)
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between text-left h-auto p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <span className="font-medium">{faq.question}</span>
                          {openFaq === index ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 py-3 text-sm text-gray-600 border-l border-r border-b border-gray-200 rounded-b-lg">
                        {faq.answer}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default HelpSupport;
