import React, { createContext, useContext, useState, useEffect } from "react";
import { useServers } from "@/hooks/useApi";

interface ServerContextType {
  selectedServerId: string | null;
  setSelectedServerId: (id: string | null) => void;
  hasServers: boolean;
  isLoading: boolean;
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
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const { data: serversResponse, isLoading } = useServers();

  const servers = serversResponse?.servers || [];
  const hasServers = servers.length > 0;

  // Auto-select first server if none is selected and servers are available
  useEffect(() => {
    if (!selectedServerId && hasServers && servers.length > 0) {
      setSelectedServerId(servers[0].id);
    }
  }, [selectedServerId, hasServers, servers]);

  // Clear selection if selected server no longer exists
  useEffect(() => {
    if (
      selectedServerId &&
      hasServers &&
      !servers.find((s) => s.id === selectedServerId)
    ) {
      setSelectedServerId(servers.length > 0 ? servers[0].id : null);
    }
  }, [selectedServerId, servers, hasServers]);

  const value: ServerContextType = {
    selectedServerId,
    setSelectedServerId,
    hasServers,
    isLoading,
  };

  return (
    <ServerContext.Provider value={value}>{children}</ServerContext.Provider>
  );
};
