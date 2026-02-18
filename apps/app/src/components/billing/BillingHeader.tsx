import { useNavigate } from "react-router";

import { ArrowLeft } from "lucide-react";

export const BillingHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/profile?tab=plans")}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Back to Profile"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Billing & Usage
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and view usage details across all your
            workspaces
          </p>
        </div>
      </div>
    </div>
  );
};
