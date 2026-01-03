import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ArrowRight, CheckCircle, CreditCard } from "lucide-react";

import { trackPurchase } from "@/lib/ga";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetchPlan, planData } = useUser();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Refresh workspace data to get updated plan
    const refreshData = async () => {
      try {
        // await refetch();
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
  }, [refetchPlan, queryClient]);

  const sessionId = searchParams.get("session_id");
  const [purchaseTracked, setPurchaseTracked] = useState(false);

  // Log session ID for debugging but don't display it
  useEffect(() => {
    if (sessionId) {
      logger.info("Payment completed successfully", { sessionId });
    }
  }, [sessionId]);

  // Track purchase event with Google Analytics
  useEffect(() => {
    const handlePurchaseTracking = async () => {
      if (!sessionId || purchaseTracked) return;

      // Wait for workspace to be available before proceeding
      if (!workspace?.id) {
        return;
      }

      try {
        // Get payment history to find the latest payment
        const utils = trpc.useUtils();
        const paymentHistory =
          await utils.payment.history.getPaymentHistory.fetch({
            limit: 1,
            offset: 0,
          });

        if (paymentHistory.payments && paymentHistory.payments.length > 0) {
          const latestPayment = paymentHistory.payments[0];

          // Track purchase event
          trackPurchase({
            transaction_id: sessionId,
            value: latestPayment.amount / 100, // Convert from cents to currency unit
            currency: "USD", // Default currency, payment history doesn't include currency
          });

          setPurchaseTracked(true);
          logger.info("Purchase event tracked", {
            transaction_id: sessionId,
            value: latestPayment.amount / 100,
            currency: "USD",
          });
        } else {
          // Fallback: use sessionId as transaction_id with default values
          trackPurchase({
            transaction_id: sessionId,
            value: 0, // Will need to be updated if payment details are not available
            currency: "EUR",
          });

          setPurchaseTracked(true);
          logger.warn("Purchase event tracked with fallback values", {
            transaction_id: sessionId,
          });
        }
      } catch (error) {
        logger.error("Failed to track purchase event:", error);
        // Still track with sessionId as fallback
        trackPurchase({
          transaction_id: sessionId,
          value: 0,
          currency: "EUR",
        });
        setPurchaseTracked(true);
      }
    };

    if (sessionId) {
      handlePurchaseTracking();
    }
  }, [sessionId, purchaseTracked, workspace?.id]);

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
                {planData.user.plan} Plan Activated
              </span>
            </div>
            <p className="text-sm text-green-600">
              Welcome to your enhanced Qarote experience!
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
