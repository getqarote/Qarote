import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api/client";
import { logger } from "@/lib/logger";

import { useAuth } from "@/contexts/AuthContextDefinition";

function DiscourseSSO() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSSO = async () => {
      try {
        if (!user) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        // Get SSO parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sso = urlParams.get("sso");
        const sig = urlParams.get("sig");

        if (!sso || !sig) {
          setError("Missing SSO parameters");
          setLoading(false);
          return;
        }

        // Process SSO callback using API client
        const response = await apiClient.processDiscourseSSOCallback(sso, sig);
        logger.info("SSO callback response:", response);

        // Redirect to Discourse with the response
        window.location.href = response.redirectUrl;
      } catch (err) {
        logger.error("SSO error:", err);
        setError("SSO authentication failed");
        setLoading(false);
      }
    };

    handleSSO();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-lg">Connecting to Discourse...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">SSO Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default DiscourseSSO;
