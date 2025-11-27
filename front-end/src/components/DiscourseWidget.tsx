/**
 * Discourse Community Widget for RabbitHQ Frontend
 * Provides seamless integration with Discourse community
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MessageSquare, Users, TrendingUp } from "lucide-react";
import { DiscourseSSOClient } from "@/lib/DiscourseSSOClient";
import logger from "@/lib/logger";

interface DiscourseStats {
  topics: number;
  posts: number;
  users: number;
  categories: number;
}

interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  posts_count: number;
  reply_count: number;
  last_posted_at: string;
  category: {
    id: number;
    name: string;
    color: string;
  };
}

interface DiscourseWidgetProps {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userUsername?: string;
  userAvatar?: string;
  className?: string;
}

export const DiscourseWidget: React.FC<DiscourseWidgetProps> = ({
  userId,
  userEmail,
  userName,
  userUsername,
  userAvatar,
  className = "",
}) => {
  const [stats, setStats] = useState<DiscourseStats | null>(null);
  const [recentTopics, setRecentTopics] = useState<DiscourseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const discourseClient = new DiscourseSSOClient();

  const fetchDiscourseData = async () => {
    try {
      // Fetch community stats and recent topics using the API client
      const [statsData, topicsData] = await Promise.all([
        discourseClient.getStats(),
        discourseClient.getTopics(5),
      ]);

      if (statsData) {
        setStats(statsData);
      }

      if (topicsData) {
        setRecentTopics(topicsData.topics || []);
      }
    } catch (error) {
      logger.error("Error fetching Discourse data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscourseData();
  }, []);

  const handleJoinCommunity = async () => {
    if (!userId || !userEmail || !userName || !userUsername) {
      // Redirect to login if user not authenticated
      window.location.href = "/login"; // TODO: Change to login page
      return;
    }

    try {
      await discourseClient.redirectToDiscourse({
        id: userId,
        email: userEmail,
        name: userName,
        username: userUsername,
        avatar_url: userAvatar,
      });
    } catch (error) {
      logger.error("Error joining community:", error);
      // Fallback: open Discourse in new tab
      // window.open("http://localhost:9000", "_blank");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Community Support
          </CardTitle>
          <CardDescription>Loading community data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Community Support
        </CardTitle>
        <CardDescription>
          Get help, share ideas, and connect with other RabbitHQ users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Community Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.topics}
              </div>
              <div className="text-sm text-muted-foreground">Topics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.posts}
              </div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.users}
              </div>
              <div className="text-sm text-muted-foreground">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.categories}
              </div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </div>
        )}

        {/* Recent Topics */}
        {recentTopics.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Discussions
            </h4>
            <div className="space-y-3">
              {recentTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    window.open(
                      `http://localhost:9000/t/${topic.slug}/${topic.id}`,
                      "_blank"
                    )
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm line-clamp-2">
                        {topic.title}
                      </h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: topic.category.color + "20",
                            color: topic.category.color,
                          }}
                        >
                          {topic.category.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {topic.reply_count} replies
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground ml-2" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatDate(topic.last_posted_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Community Button */}
        <div className="pt-4 border-t">
          <Button onClick={handleJoinCommunity} className="w-full" size="lg">
            <Users className="h-4 w-4 mr-2" />
            {userId ? "Join Community" : "Login to Join Community"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Connect with other users, get support, and share your RabbitMQ
            expertise
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Compact Discourse Link Component
 */
export const DiscourseLink: React.FC<DiscourseWidgetProps> = ({
  userId,
  userEmail,
  userName,
  userUsername,
  userAvatar: _userAvatar,
}) => {
  const handleClick = () => {
    if (!userId || !userEmail || !userName || !userUsername) {
      window.location.href = "/login";
      return;
    }

    // Open Discourse in a new tab instead of redirecting
    const discourseUrl =
      import.meta.env.VITE_DISCOURSE_URL || "http://localhost:9000";
    window.open(discourseUrl, "_blank");
  };

  return (
    <Button variant="outline" onClick={handleClick} className="gap-2">
      <MessageSquare className="h-4 w-4" />
      Community Support
    </Button>
  );
};
