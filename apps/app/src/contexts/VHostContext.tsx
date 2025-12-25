import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useVHosts } from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";

import { useServerContext } from "./ServerContext";
import { VHostContext, type VHostContextType } from "./VHostContextDefinition";

// Re-export hook for convenience

interface VHostProviderProps {
  children: React.ReactNode;
}

export const VHostProvider: React.FC<VHostProviderProps> = ({ children }) => {
  const { selectedServerId } = useServerContext();
  const { data: vhostsResponse, isLoading } = useVHosts(
    selectedServerId,
    !!selectedServerId
  );

  const availableVHosts = useMemo(
    () => vhostsResponse?.vhosts || [],
    [vhostsResponse]
  );

  // Get server's configured vhost from servers list
  const { data: serversResponse } = useServers();
  const servers = useMemo(
    () => serversResponse?.servers || [],
    [serversResponse]
  );
  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const serverVHost = selectedServer?.vhost || "/";

  // Initialize from URL parameters (highest priority), then localStorage
  const [selectedVHost, setSelectedVHostState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      // Check URL parameters first (from email/Slack CTAs)
      const urlParams = new URLSearchParams(window.location.search);
      const urlVHost = urlParams.get("vhost");
      if (urlVHost) {
        const decodedVHost = decodeURIComponent(urlVHost);
        // Save to localStorage for this server if we have a serverId
        if (selectedServerId) {
          localStorage.setItem(
            `selectedVHost_${selectedServerId}`,
            decodedVHost
          );
        }
        return decodedVHost;
      }
      // Fallback to localStorage if no URL parameter
      if (selectedServerId) {
        const stored = localStorage.getItem(
          `selectedVHost_${selectedServerId}`
        );
        return stored || null;
      }
    }
    return null;
  });

  // Custom setter that also persists to localStorage
  const handleSetSelectedVHost = useCallback(
    (vhost: string | null) => {
      setSelectedVHostState(vhost);
      if (typeof window !== "undefined" && selectedServerId) {
        if (vhost) {
          localStorage.setItem(`selectedVHost_${selectedServerId}`, vhost);
        } else {
          localStorage.removeItem(`selectedVHost_${selectedServerId}`);
        }
      }
    },
    [selectedServerId]
  );

  // Auto-select server's configured vhost when server changes
  // Only runs if no vhost is currently selected (doesn't override URL parameters)
  useEffect(() => {
    if (!selectedServerId) {
      setSelectedVHostState(null);
      return;
    }

    // Don't auto-select if vhost is already set (might be from URL parameter)
    if (selectedVHost) {
      return;
    }

    // If vhosts are loaded, validate and set default
    if (availableVHosts.length > 0) {
      // Check if stored vhost exists in available vhosts
      const storedVHost = localStorage.getItem(
        `selectedVHost_${selectedServerId}`
      );
      if (storedVHost) {
        const vhostExists = availableVHosts.some((v) => v.name === storedVHost);
        if (vhostExists) {
          setSelectedVHostState(storedVHost);
          return;
        }
      }

      // Check if server's configured vhost exists in available vhosts
      const serverVHostExists = availableVHosts.some(
        (v) => v.name === serverVHost
      );
      if (serverVHostExists) {
        handleSetSelectedVHost(serverVHost);
      } else {
        // Fallback to "/" if it exists, otherwise first vhost
        const defaultVHost = availableVHosts.find((v) => v.name === "/");
        if (defaultVHost) {
          handleSetSelectedVHost("/");
        } else if (availableVHosts.length > 0) {
          handleSetSelectedVHost(availableVHosts[0].name);
        }
      }
    }
  }, [
    selectedServerId,
    availableVHosts,
    serverVHost,
    handleSetSelectedVHost,
    selectedVHost,
  ]);

  // Validate selected vhost exists in available vhosts
  // Only resets if vhost doesn't exist (doesn't interfere with URL parameters)
  useEffect(() => {
    if (selectedVHost && availableVHosts.length > 0) {
      const vhostExists = availableVHosts.some((v) => v.name === selectedVHost);
      if (!vhostExists) {
        // Selected vhost no longer exists in available vhosts, reset to default
        // But only if vhosts have been loaded (not during initial load)
        const defaultVHost = availableVHosts.find(
          (v) => v.name === serverVHost
        );
        if (defaultVHost) {
          handleSetSelectedVHost(serverVHost);
        } else if (availableVHosts.length > 0) {
          handleSetSelectedVHost(availableVHosts[0].name);
        }
      }
    }
  }, [selectedVHost, availableVHosts, serverVHost, handleSetSelectedVHost]);

  const value: VHostContextType = {
    selectedVHost,
    setSelectedVHost: handleSetSelectedVHost,
    availableVHosts,
    isLoading,
  };

  return (
    <VHostContext.Provider value={value}>{children}</VHostContext.Provider>
  );
};
