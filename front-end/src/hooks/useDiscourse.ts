/**
 * Discourse Integration Hook for RabbitHQ
 * Provides easy access to Discourse functionality using the main API client
 */

import { useCallback, useState } from "react";

import { apiClient } from "@/lib/api";
import { DiscourseSSOClient, DiscourseUser } from "@/lib/DiscourseSSOClient";

export { type DiscourseUser };

interface UseDiscourseOptions {
  discourseUrl?: string;
  autoRedirect?: boolean;
}

export const useDiscourse = (options: UseDiscourseOptions = {}) => {
  const { discourseUrl, autoRedirect = false } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discourseClient = new DiscourseSSOClient();

  const joinCommunity = useCallback(
    async (user: DiscourseUser) => {
      setLoading(true);
      setError(null);

      try {
        await discourseClient.redirectToDiscourse(user);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to join community";
        setError(errorMessage);

        if (autoRedirect) {
          discourseClient.openDiscourse();
        }
      } finally {
        setLoading(false);
      }
    },
    [discourseClient, autoRedirect]
  );

  const openCommunity = useCallback(() => {
    discourseClient.openDiscourse();
  }, [discourseClient]);

  const getEmbedUrl = useCallback(
    async (topicId?: string, categoryId?: string) => {
      return discourseClient.getEmbedUrl(topicId, categoryId);
    },
    [discourseClient]
  );

  return {
    joinCommunity,
    openCommunity,
    getEmbedUrl,
    loading,
    error,
    discourseUrl,
  };
};

/**
 * Hook for Discourse community stats using the main API client
 */
export const useDiscourseStats = () => {
  const [stats, setStats] = useState<{
    topics: number;
    posts: number;
    users: number;
    categories: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.getDiscourseStats();
      setStats(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stats";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    error,
    fetchStats,
  };
};

/**
 * Hook for recent Discourse topics using the main API client
 */
export const useDiscourseTopics = (limit: number = 5) => {
  const [topics, setTopics] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.getDiscourseTopics(limit);
      setTopics(data.topics || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch topics";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  return {
    topics,
    loading,
    error,
    fetchTopics,
  };
};
