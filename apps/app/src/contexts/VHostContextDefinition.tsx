import { createContext, useContext } from "react";

import { VHost } from "@/lib/api/vhostTypes";

interface VHostContextType {
  selectedVHost: string | null;
  setSelectedVHost: (vhost: string | null) => void;
  availableVHosts: VHost[];
  isLoading: boolean;
}

export const VHostContext = createContext<VHostContextType | undefined>(
  undefined
);

export const useVHostContext = () => {
  const context = useContext(VHostContext);
  if (context === undefined) {
    throw new Error("useVHostContext must be used within a VHostProvider");
  }
  return context;
};

export type { VHostContextType };
