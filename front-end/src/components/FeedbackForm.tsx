import { useState } from "react";
import { MessageSquare, Bug, Lightbulb, HelpCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import type { FeedbackRequest } from "@/types/feedback";

interface FeedbackFormProps {
  onSuccess?: () => void;
  className?: string;
}

const feedbackTypes = [
  {
    value: "BUG" as const,
    label: "Bug Report",
    description: "Something isn't working as expected",
    icon: Bug,
    color: "text-red-600",
  },
  {
    value: "FEATURE" as const,
    label: "Feature Request",
    description: "Suggest a new feature or enhancement",
    icon: Lightbulb,
    color: "text-yellow-600",
  },
  {
    value: "IMPROVEMENT" as const,
    label: "Improvement",
    description: "Suggest ways to improve existing features",
    icon: Zap,
    color: "text-blue-600",
  },
  {
    value: "GENERAL" as const,
    label: "General Feedback",
    description: "Any other feedback or questions",
    icon: MessageSquare,
    color: "text-green-600",
  },
];

const categories = [
  { value: "UI_UX", label: "User Interface & Experience" },
  { value: "PERFORMANCE", label: "Performance & Speed" },
  { value: "SECURITY", label: "Security & Privacy" },
  { value: "FUNCTIONALITY", label: "Core Functionality" },
  { value: "DOCUMENTATION", label: "Documentation & Help" },
  { value: "OTHER", label: "Other" },
];

const priorities = [
  { value: "LOW", label: "Low", description: "Nice to have" },
  { value: "MEDIUM", label: "Medium", description: "Important but not urgent" },
  { value: "HIGH", label: "High", description: "Urgent or blocking" },
];

export function FeedbackForm({ onSuccess, className }: FeedbackFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<FeedbackRequest>>({
    type: undefined,
    category: undefined,
    title: "",
    description: "",
    priority: "MEDIUM",
    email: user?.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.type ||
      !formData.category ||
      !formData.title ||
      !formData.description
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: FeedbackRequest = {
        type: formData.type,
        category: formData.category,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority || "MEDIUM",
        email: formData.email?.trim() || undefined,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString(),
        },
      };

      await apiClient.submitFeedback(feedbackData);

      toast({
        title: "Feedback Submitted",
        description:
          "Thank you for your feedback! We'll review it and get back to you if needed.",
      });

      // Reset form
      setFormData({
        type: undefined,
        category: undefined,
        title: "",
        description: "",
        priority: "MEDIUM",
        email: user?.email || "",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Send Feedback
        </CardTitle>
        <CardDescription>
          Help us improve the RabbitMQ Dashboard by sharing your thoughts,
          reporting bugs, or suggesting new features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              What type of feedback do you have? *
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.value}
                    className={`relative cursor-pointer rounded-lg border p-4 transition-all hover:border-gray-300 ${
                      formData.type === type.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, type: type.value })
                    }
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${type.color} mt-0.5`} />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{type.label}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  category: value as FeedbackRequest["category"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief summary of your feedback"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              maxLength={100}
            />
            <p className="text-xs text-gray-500">
              {formData.title?.length || 0}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about your feedback. For bugs, please include steps to reproduce."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500">
              {formData.description?.length || 0}/1000 characters
            </p>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  priority: value as FeedbackRequest["priority"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    <div className="flex flex-col">
                      <span>{priority.label}</span>
                      <span className="text-xs text-gray-500">
                        {priority.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <p className="text-xs text-gray-500">
              We'll only use this to follow up on your feedback if needed
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
