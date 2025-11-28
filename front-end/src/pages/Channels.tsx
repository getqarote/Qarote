import { MessageSquare } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Channels = () => {
  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="content-container-large">
            {/* Header */}
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="title-page">Channels</h1>
                <p className="text-gray-500">
                  Monitor active RabbitMQ channels
                </p>
              </div>
            </div>

            {/* Coming Soon Card */}
            <Card className="border-0 shadow-md bg-card">
              <CardContent className="p-12">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Coming Soon
                  </h2>
                  <p className="text-gray-600">
                    The channels monitoring page is under development.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Channels;
