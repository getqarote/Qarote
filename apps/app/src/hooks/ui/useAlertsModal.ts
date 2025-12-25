import { useContext } from "react";

import { AlertsModalContext } from "@/contexts/AlertsModalContext";

export function useAlertsModal() {
  const context = useContext(AlertsModalContext);
  if (!context) {
    throw new Error(
      "useAlertsModal must be used within an AlertsModalProvider"
    );
  }
  return context;
}
