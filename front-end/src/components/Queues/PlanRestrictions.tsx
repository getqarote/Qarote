import { Crown, MessageSquare, X } from "lucide-react";
import { WorkspacePlan } from "@/types/plans";

interface PlanRestrictionsProps {
  workspacePlan: WorkspacePlan;
  queueCount: number;
  monthlyMessageCount: number;
  canAddQueue: boolean;
  canSendMessages: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function PlanRestrictions({
  workspacePlan,
  queueCount,
  monthlyMessageCount,
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
      case "FREE":
        return {
          title: "Queue creation is not available on the Free plan",
          description:
            "Upgrade to Developer, Startup, or Business plan to create and manage custom queues.",
          buttonColor: "bg-orange-500 hover:bg-orange-600",
        };
      case "DEVELOPER":
        return {
          title: `You've reached your queue limit (${queueCount}/10)`,
          description:
            "Upgrade to Startup plan for 50 queues or Business plan for 200 queues.",
          buttonColor: "bg-blue-500 hover:bg-blue-600",
        };
      case "STARTUP":
        return {
          title: `You've reached your queue limit (${queueCount}/50)`,
          description: "Upgrade to Business plan for 200 queues.",
          buttonColor: "bg-purple-500 hover:bg-purple-600",
        };
      case "BUSINESS":
        return {
          title: `You've reached your queue limit (${queueCount}/200)`,
          description:
            "Contact support for enterprise solutions with unlimited queues.",
          buttonColor: "bg-green-500 hover:bg-green-600",
        };
      default:
        return {
          title: "Queue creation is restricted",
          description: "Upgrade your plan to create more queues.",
          buttonColor: "bg-orange-500 hover:bg-orange-600",
        };
    }
  };

  const getMessageRestrictionMessage = () => {
    switch (workspacePlan) {
      case "FREE":
        return {
          title: "Message sending is not available on the Free plan",
          description:
            "Upgrade to send messages to queues. Developer: 100/month, Startup: 1,000/month, Business: unlimited.",
          buttonColor: "bg-red-500 hover:bg-red-600",
        };
      case "DEVELOPER":
        return {
          title: `You've reached your monthly message limit (${monthlyMessageCount}/100)`,
          description:
            "Upgrade to Startup plan for 1,000 messages/month or Business plan for unlimited messages.",
          buttonColor: "bg-blue-500 hover:bg-blue-600",
        };
      case "STARTUP":
        return {
          title: `You've reached your monthly message limit (${monthlyMessageCount}/1,000)`,
          description: "Upgrade to Business plan for unlimited messages.",
          buttonColor: "bg-purple-500 hover:bg-purple-600",
        };
      default:
        return {
          title: "Message sending is restricted",
          description: "Upgrade your plan to send more messages.",
          buttonColor: "bg-red-500 hover:bg-red-600",
        };
    }
  };

  return (
    <div className="mb-6 space-y-4">
      {!canAddQueue && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg relative">
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 p-1 hover:bg-orange-100 rounded-full transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4 text-orange-600" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <Crown className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-medium text-orange-900">
                {getQueueRestrictionMessage().title}
              </p>
              <p className="text-sm text-orange-700 mt-1">
                {getQueueRestrictionMessage().description}
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className={`ml-auto px-4 py-2 ${getQueueRestrictionMessage().buttonColor} text-white rounded-lg font-medium transition-colors`}
            >
              {workspacePlan === "BUSINESS" ? "Contact Support" : "Upgrade Now"}
            </button>
          </div>
        </div>
      )}

      {!canSendMessages && (
        <div
          className={`p-4 border rounded-lg relative ${
            workspacePlan === "FREE"
              ? "bg-red-50 border-red-200"
              : workspacePlan === "DEVELOPER"
                ? "bg-blue-50 border-blue-200"
                : workspacePlan === "STARTUP"
                  ? "bg-purple-50 border-purple-200"
                  : "bg-red-50 border-red-200"
          }`}
        >
          <button
            onClick={onDismiss}
            className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
              workspacePlan === "FREE"
                ? "hover:bg-red-100"
                : workspacePlan === "DEVELOPER"
                  ? "hover:bg-blue-100"
                  : workspacePlan === "STARTUP"
                    ? "hover:bg-purple-100"
                    : "hover:bg-red-100"
            }`}
            title="Dismiss notification"
          >
            <X
              className={`w-4 h-4 ${
                workspacePlan === "FREE"
                  ? "text-red-600"
                  : workspacePlan === "DEVELOPER"
                    ? "text-blue-600"
                    : workspacePlan === "STARTUP"
                      ? "text-purple-600"
                      : "text-red-600"
              }`}
            />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <MessageSquare
              className={`w-5 h-5 ${
                workspacePlan === "FREE"
                  ? "text-red-500"
                  : workspacePlan === "DEVELOPER"
                    ? "text-blue-500"
                    : workspacePlan === "STARTUP"
                      ? "text-purple-500"
                      : "text-red-500"
              }`}
            />
            <div>
              <p
                className={`font-medium ${
                  workspacePlan === "FREE"
                    ? "text-red-900"
                    : workspacePlan === "DEVELOPER"
                      ? "text-blue-900"
                      : workspacePlan === "STARTUP"
                        ? "text-purple-900"
                        : "text-red-900"
                }`}
              >
                {getMessageRestrictionMessage().title}
              </p>
              <p
                className={`text-sm mt-1 ${
                  workspacePlan === "FREE"
                    ? "text-red-700"
                    : workspacePlan === "DEVELOPER"
                      ? "text-blue-700"
                      : workspacePlan === "STARTUP"
                        ? "text-purple-700"
                        : "text-red-700"
                }`}
              >
                {getMessageRestrictionMessage().description}
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className={`ml-auto px-4 py-2 ${getMessageRestrictionMessage().buttonColor} text-white rounded-lg font-medium transition-colors`}
            >
              {workspacePlan === "BUSINESS" ? "Contact Support" : "Upgrade Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
