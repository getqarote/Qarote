import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Search, Sparkles } from "lucide-react";

export const MessageBrowserHeader = () => {
  const { workspacePlan } = useWorkspace();

  return (
    <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
      <div className="px-6 py-8">
        <div className="flex items-center justify-between">
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
                  Message exploration across all your queues
                </p>
              </div>
            </div>
          </div>
          <PlanBadge workspacePlan={workspacePlan} />
        </div>
      </div>
    </div>
  );
};
