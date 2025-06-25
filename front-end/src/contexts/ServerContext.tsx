import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useServers } from "@/hooks/useApi";

interface ServerContextType {
  selectedServerId: string | null;
  setSelectedServerId: (id: string | null) => void;
  hasServers: boolean;
  isLoading: boolean;
  serverCount: number;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const useServerContext = () => {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error("useServerContext must be used within a ServerProvider");
  }
  return context;
};

interface ServerProviderProps {
  children: React.ReactNode;
}

export const ServerProvider: React.FC<ServerProviderProps> = ({ children }) => {
  // Initialize from localStorage if available
  const [selectedServerId, setSelectedServerId] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("selectedServerId");
      }
      return null;
    }
  );

  const { data: serversResponse, isLoading } = useServers();

  const servers = useMemo(
    () => serversResponse?.servers || [],
    [serversResponse]
  );
  const hasServers = servers.length > 0;

  // Custom setter that also persists to localStorage
  const handleSetSelectedServerId = (id: string | null) => {
    setSelectedServerId(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem("selectedServerId", id);
      } else {
        localStorage.removeItem("selectedServerId");
      }
    }
  };

  // Auto-select first server if none is selected and servers are available
  useEffect(() => {
    if (!selectedServerId && hasServers && servers.length > 0) {
      handleSetSelectedServerId(servers[0].id);
    }
  }, [selectedServerId, hasServers, servers]);

  // Clear selection if selected server no longer exists
  useEffect(() => {
    if (
      selectedServerId &&
      hasServers &&
      !servers.find((s) => s.id === selectedServerId)
    ) {
      handleSetSelectedServerId(servers.length > 0 ? servers[0].id : null);
    }
  }, [selectedServerId, servers, hasServers]);

  const value: ServerContextType = {
    selectedServerId,
    setSelectedServerId: handleSetSelectedServerId,
    hasServers,
    isLoading,
    serverCount: servers.length,
  };

  return (
    <ServerContext.Provider value={value}>{children}</ServerContext.Provider>
  );
};
