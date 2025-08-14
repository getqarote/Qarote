import { Crown, MessageSquare, X } from "lucide-react";
import { WorkspacePlan } from "@/types/plans";

interface PlanRestrictionsProps {
  workspacePlan: WorkspacePlan;
  queueCount: number;
  canAddQueue: boolean;
  canSendMessages: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function PlanRestrictions({
  workspacePlan,
  queueCount,
  canAddQueue,
  canSendMessages,
  onUpgrade,
  onDismiss,
}: PlanRestrictionsProps) {
  if (canAddQueue && canSendMessages) {
    return null;
  }

  const getQueueRestrictionMessage = () => {
    switch (workspacePlan) {
      case WorkspacePlan.FREE:
        return {
          title: "Queue creation is not available on the Free plan",
          description:
            "Upgrade to Developer or Enterprise plan to create and manage custom queues.",
          buttonColor: "bg-orange-500 hover:bg-orange-600",
        };
      case WorkspacePlan.DEVELOPER:
        return {
          title: "Queue management available",
          description:
            "You can create and manage queues with the Developer plan.",
          buttonColor: "bg-blue-500 hover:bg-blue-600",
        };
      case WorkspacePlan.ENTERPRISE:
        return {
          title: "Full queue management available",
          description:
            "You have unlimited queue management with the Enterprise plan.",
          buttonColor: "bg-purple-500 hover:bg-purple-600",
        };
      default:
        return {
          title: "Queue creation is restricted",
          description: "Upgrade your plan to create queues.",
          buttonColor: "bg-orange-500 hover:bg-orange-600",
        };
    }
  };

  const getMessageRestrictionMessage = () => {
    switch (workspacePlan) {
      case WorkspacePlan.FREE:
        return {
          title: "Message sending is not available on the Free plan",
          description:
            "Upgrade to Developer or Enterprise plan to send messages to queues.",
          buttonColor: "bg-red-500 hover:bg-red-600",
        };
      case WorkspacePlan.DEVELOPER:
        return {
          title: "Message sending available",
          description:
            "You can send messages to queues with the Developer plan.",
          buttonColor: "bg-blue-500 hover:bg-blue-600",
        };
      case WorkspacePlan.ENTERPRISE:
        return {
          title: "Full message management available",
          description:
            "You have unlimited message sending with the Enterprise plan.",
          buttonColor: "bg-purple-500 hover:bg-purple-600",
        };
      default:
        return {
          title: "Message sending is restricted",
          description: "Upgrade your plan to send messages.",
          buttonColor: "bg-red-500 hover:bg-red-600",
        };
    }
  };

  const queueRestriction = getQueueRestrictionMessage();
  const messageRestriction = getMessageRestrictionMessage();

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-orange-500" />
            <h3 className="font-medium text-gray-900">Plan Restrictions</h3>
          </div>

          <div className="space-y-3">
            {!canAddQueue && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    {queueRestriction.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {queueRestriction.description}
                  </p>
                </div>
              </div>
            )}

            {!canSendMessages && (
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    {messageRestriction.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {messageRestriction.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={onUpgrade}
              className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
                workspacePlan === WorkspacePlan.ENTERPRISE
                  ? "bg-gray-500 hover:bg-gray-600"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {workspacePlan === WorkspacePlan.ENTERPRISE
                ? "Contact Support"
                : "Upgrade Now"}
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
