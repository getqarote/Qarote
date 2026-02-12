import { useState } from "react";

import { FileCode, FileText, Search, X } from "lucide-react";

import { DockerComposeSection } from "@/components/documentation/DockerComposeSection";
import { EnvironmentConfigSection } from "@/components/documentation/EnvironmentConfigSection";
import { InstallationGuideSection } from "@/components/documentation/InstallationGuideSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BackToTop } from "@/components/ui/back-to-top";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { TableOfContents } from "@/components/ui/table-of-contents";

import { TOC_ITEMS } from "@/constants/documentation.constants";

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter sections based on search query
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const showDockerCompose = matchesSearch("docker compose yaml configuration");
  const showEnvConfig = matchesSearch(
    "environment variables configuration env"
  );
  const showInstallation = matchesSearch(
    "installation guide setup deploy prerequisites quick start updating troubleshooting security support dokku"
  );

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="mb-6 max-w-5xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6 max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold">Self-Hosted Deployment</h1>
            <p className="text-muted-foreground mt-2">
              Everything you need to deploy Qarote on your own infrastructure
            </p>
          </div>

          {/* Installation Guide - primary content */}
          {showInstallation && <InstallationGuideSection />}

          {/* Reference sections - collapsible */}
          {(showDockerCompose || showEnvConfig) && (
            <Accordion type="multiple" className="w-full space-y-4">
              {showDockerCompose && (
                <AccordionItem
                  value="docker-compose"
                  className="border rounded-lg"
                >
                  <div id="docker-compose">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-5 w-5" />
                        <Heading level={3} id="docker-compose-heading">
                          Docker Compose File
                        </Heading>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="px-6 pb-6">
                    <DockerComposeSection />
                  </AccordionContent>
                </AccordionItem>
              )}

              {showEnvConfig && (
                <AccordionItem value="env-config" className="border rounded-lg">
                  <div id="environment-config">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <Heading level={3} id="environment-config-heading">
                          Environment Configuration
                        </Heading>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="px-6 pb-6">
                    <EnvironmentConfigSection />
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </div>

        {/* Table of Contents Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <TableOfContents items={[...TOC_ITEMS]} />
        </aside>
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default Documentation;
