import { Crown, MessageSquare } from "lucide-react";
import { WorkspacePlan } from "@/lib/plans/planUtils";

interface PlanRestrictionsProps {
  canAddQueue: boolean;
  canSendMessages: boolean;
  onUpgrade: () => void;
}

export function PlanRestrictions({
  canAddQueue,
  canSendMessages,
  onUpgrade,
}: PlanRestrictionsProps) {
  if (canAddQueue && canSendMessages) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      {!canAddQueue && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-medium text-orange-900">
                Queue creation is not available on the Free plan
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Upgrade to Freelance, Startup, or Business plan to create and
                manage custom queues.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="ml-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {!canSendMessages && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-medium text-red-900">
                Message sending is not available on the Free plan
              </p>
              <p className="text-sm text-red-700 mt-1">
                Upgrade to send messages to queues. Freelance: 100/month,
                Startup: 1,000/month, Business: unlimited.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="ml-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
