import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import logger from "@/lib/logger";

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetch, refetchPlan } = useWorkspace();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Refresh workspace data to get updated plan
    const refreshData = async () => {
      try {
        await refetch();
        await refetchPlan();
        // Invalidate all plan-related queries
        await queryClient.invalidateQueries({ queryKey: ["plans"] });
        await queryClient.invalidateQueries({ queryKey: ["workspace"] });
        logger.info("Workspace data refreshed after successful payment");
      } catch (error) {
        logger.error("Failed to refresh workspace data:", error);
      }
    };

    refreshData();
  }, [refetch, refetchPlan, queryClient]);

  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your subscription has been activated successfully. You now have
            access to all premium features.
          </p>
        </div>

        {sessionId && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Session ID: <span className="font-mono text-xs">{sessionId}</span>
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate("/queues")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>

          <button
            onClick={() => navigate("/workspace/billing")}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium transition-colors"
          >
            View Billing
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
