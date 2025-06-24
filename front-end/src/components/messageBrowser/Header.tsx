import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Search, Sparkles, MessageSquare, Database, Zap } from "lucide-react";

interface MessageStats {
  totalMessages: number;
  totalQueues: number;
  avgMessageSize: number;
}

interface MessageBrowserHeaderProps {
  messageStats: MessageStats;
  selectedQueue: string;
}

export const MessageBrowserHeader = ({
  messageStats,
  selectedQueue,
}: MessageBrowserHeaderProps) => {
  const { workspacePlan } = useWorkspace();

  return (
    <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-white hover:bg-white/20" />
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Search className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  Message Browser
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    NEW
                  </Badge>
                </h1>
                <p className="text-purple-100 text-lg">
                  Powerful message exploration across all your queues
                </p>
              </div>
            </div>
          </div>
          <PlanBadge workspacePlan={workspacePlan} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {messageStats.totalMessages}
                  </p>
                  <p className="text-purple-100 text-sm">Messages Found</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {messageStats.totalQueues}
                  </p>
                  <p className="text-purple-100 text-sm">
                    {selectedQueue === "all"
                      ? "Queues Scanned"
                      : "Queue Selected"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-white" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {messageStats.avgMessageSize}B
                  </p>
                  <p className="text-purple-100 text-sm">Avg Size</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
