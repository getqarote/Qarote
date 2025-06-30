import React from "react";
import { Crown, Zap } from "lucide-react";
import { WorkspacePlan } from "@/types/plans";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import PlanUpgradeModal from "@/components/plans/PlanUpgradeModal";

interface PremiumPageWrapperProps {
  children: React.ReactNode;
  workspacePlan?: WorkspacePlan; // Make optional since we can get from context
  feature: string;
  featureDescription: string;
  requiredPlan?: string;
  preserveLayout?: boolean; // New prop to preserve the existing layout structure
}

const PremiumPageWrapper: React.FC<PremiumPageWrapperProps> = ({
  children,
  workspacePlan: propPlan,
  feature,
  featureDescription,
  requiredPlan = "Developer or higher",
}) => {
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const {
    canAccessRouting,
    workspacePlan: contextPlan,
    planData,
  } = useWorkspace();

  // Use prop plan if provided, otherwise use context plan
  const plan = propPlan || contextPlan;
  const hasAccess = canAccessRouting;

  if (hasAccess) {
    return <>{children}</>;
  }

  // For preserveLayout=true: Use the MainContentBlurWrapper to specifically target main content
  return (
    <MainContentBlurWrapper
      feature={feature}
      featureDescription={featureDescription}
      workspacePlan={plan}
      requiredPlan={requiredPlan}
      showUpgradeModal={showUpgradeModal}
      setShowUpgradeModal={setShowUpgradeModal}
    >
      {children}
    </MainContentBlurWrapper>
  );
};

// Component that handles blurring only the main content
const MainContentBlurWrapper: React.FC<{
  children: React.ReactNode;
  feature: string;
  featureDescription: string;
  workspacePlan: WorkspacePlan;
  requiredPlan: string;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
}> = ({
  children,
  feature,
  featureDescription,
  workspacePlan,
  requiredPlan,
  showUpgradeModal,
  setShowUpgradeModal,
}) => {
  const { planData } = useWorkspace();
  // Clone children and look for main elements to blur
  const processChildren = (element: React.ReactNode): React.ReactNode => {
    if (React.isValidElement(element)) {
      // Check if this is a main element with the target classes
      if (element.type === "main") {
        // Wrap this main element with blur and overlay
        return (
          <div className="relative flex-1 flex flex-col overflow-hidden">
            {/* Blurred main content */}
            <div className="filter blur-lg pointer-events-none select-none">
              {React.cloneElement(
                element as React.ReactElement<{ className?: string }>,
                {
                  className: (element.props.className || "") + " opacity-50",
                }
              )}
            </div>

            {/* Overlay specifically for this main content */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/80 flex items-center justify-center z-50">
              <div className="bg-white/98 backdrop-blur-md border-2 border-orange-200 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
                <div className="text-center">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Premium Feature
                  </h3>

                  {/* Current Plan Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700 mb-4">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    {planData?.planFeatures?.displayName || workspacePlan} Plan
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-2">
                    <strong>{feature}</strong> {featureDescription}
                  </p>

                  <p className="text-sm text-gray-500 mb-6">
                    Upgrade to {requiredPlan} to unlock this feature and enhance
                    your RabbitMQ management experience.
                  </p>

                  {/* Upgrade Button */}
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Upgrade Now
                  </button>

                  {/* Feature Preview Note */}
                  <p className="text-xs text-gray-400 mt-4">
                    Preview of {feature} - Full functionality available after
                    upgrade
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // If element has children, recursively process them
      if (element.props.children) {
        const processedChildren = React.Children.map(
          element.props.children,
          processChildren
        );
        return React.cloneElement(element, {}, processedChildren);
      }
    }

    return element;
  };

  return (
    <>
      {processChildren(children)}

      {/* Upgrade Modal */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={workspacePlan}
        feature={feature.toLowerCase()}
      />
    </>
  );
};

export default PremiumPageWrapper;
