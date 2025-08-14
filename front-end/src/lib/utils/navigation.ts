import { NavigateFunction } from "react-router-dom";

/**
 * Helper function to handle plan upgrades by redirecting to plans page
 */
export const handlePlanUpgrade = (navigate: NavigateFunction) => {
  navigate("/plans");
};

/**
 * Hook to get a function that redirects to plans page
 * Use this instead of showing the PlanUpgradeModal
 */
export const useNavigateToPlans = (navigate: NavigateFunction) => {
  return () => handlePlanUpgrade(navigate);
};
