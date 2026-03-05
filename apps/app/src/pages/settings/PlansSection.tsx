import { PlansSummaryTab } from "@/components/profile";

import { useUser } from "@/hooks/ui/useUser";

const PlansSection = () => {
  const { userPlan } = useUser();

  return (
    <div className="space-y-6">
      <PlansSummaryTab currentPlan={userPlan} />
    </div>
  );
};

export default PlansSection;
