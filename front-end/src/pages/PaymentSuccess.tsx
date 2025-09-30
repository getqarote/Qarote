import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, CreditCard } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useQueryClient } from "@tanstack/react-query";
import logger from "@/lib/logger";

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetch, refetchPlan, planData } = useUser();
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

  // Log session ID for debugging but don't display it
  useEffect(() => {
    if (sessionId) {
      logger.info("Payment completed successfully", { sessionId });
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 flex items-center justify-center p-4">
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

        {/* Show plan information instead of session ID */}
        {planData && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <CreditCard className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium text-green-800">
                {planData.workspace.plan} Plan Activated
              </span>
            </div>
            <p className="text-sm text-green-600">
              Welcome to your enhanced RabbitHQ experience!
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate("/")}
            className="w-full bg-gradient-button hover:bg-gradient-button-hover text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            Explore Your Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>

          <button
            onClick={() => navigate("/billing")}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Manage Subscription
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help? Contact our support team
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
