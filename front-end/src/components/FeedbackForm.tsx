import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, Bug, Lightbulb, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import logger from "../lib/logger";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import type { FeedbackRequest } from "@/types/feedback";
import { feedbackSchema, type FeedbackFormData } from "@/schemas/forms";

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

  // Initialize form with react-hook-form
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: undefined,
      category: undefined,
      title: "",
      description: "",
      priority: "MEDIUM",
      email: user?.email || "",
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);

    try {
      const feedbackData: FeedbackRequest = {
        type: data.type,
        category: data.category,
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority || "MEDIUM",
        email: data.email?.trim() || undefined,
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
      form.reset({
        type: undefined,
        category: undefined,
        title: "",
        description: "",
        priority: "MEDIUM",
        email: user?.email || "",
      });

      onSuccess?.();
    } catch (error) {
      logger.error("Failed to submit feedback:", error);
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Feedback Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    What type of feedback do you have? *
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {feedbackTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <div
                            key={type.value}
                            className={`relative cursor-pointer rounded-lg border p-4 transition-all hover:border-gray-300 ${
                              field.value === type.value
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 bg-white"
                            }`}
                            onClick={() => field.onChange(type.value)}
                          >
                            <div className="flex items-start gap-3">
                              <Icon
                                className={`w-5 h-5 ${type.color} mt-0.5`}
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {type.label}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {type.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief summary of your feedback"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    {field.value?.length || 0}/100 characters
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide detailed information about your feedback. For bugs, please include steps to reproduce."
                      rows={4}
                      maxLength={1000}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    {field.value?.length || 0}/1000 characters
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email (optional) */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    We'll only use this to follow up on your feedback if needed
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              className="w-full"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
