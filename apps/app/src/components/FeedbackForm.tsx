import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bug, Lightbulb, MessageSquare, Zap } from "lucide-react";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useSubmitFeedback } from "@/hooks/queries/useFeedback";
import { useToast } from "@/hooks/ui/useToast";

import { type FeedbackFormData, feedbackSchema } from "@/schemas";

import type { FeedbackRequest } from "@/types/feedback";

interface FeedbackFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function FeedbackForm({ onSuccess, className }: FeedbackFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation("settings");

  const feedbackTypes = [
    {
      value: "BUG" as const,
      label: t("feedback.bugReport"),
      description: t("feedback.bugReportDesc"),
      icon: Bug,
      color: "text-destructive",
    },
    {
      value: "FEATURE" as const,
      label: t("feedback.featureRequest"),
      description: t("feedback.featureRequestDesc"),
      icon: Lightbulb,
      color: "text-warning",
    },
    {
      value: "IMPROVEMENT" as const,
      label: t("feedback.improvement"),
      description: t("feedback.improvementDesc"),
      icon: Zap,
      color: "text-info",
    },
    {
      value: "GENERAL" as const,
      label: t("feedback.generalFeedback"),
      description: t("feedback.generalFeedbackDesc"),
      icon: MessageSquare,
      color: "text-success",
    },
  ];

  const categories = [
    { value: "UI_UX", label: t("feedback.categoryUiUx") },
    { value: "PERFORMANCE", label: t("feedback.categoryPerformance") },
    { value: "SECURITY", label: t("feedback.categorySecurity") },
    { value: "FUNCTIONALITY", label: t("feedback.categoryFunctionality") },
    { value: "DOCUMENTATION", label: t("feedback.categoryDocumentation") },
    { value: "OTHER", label: t("feedback.categoryOther") },
  ];

  const priorities = [
    {
      value: "LOW",
      label: t("feedback.priorityLow"),
      description: t("feedback.priorityLowDesc"),
    },
    {
      value: "MEDIUM",
      label: t("feedback.priorityMedium"),
      description: t("feedback.priorityMediumDesc"),
    },
    {
      value: "HIGH",
      label: t("feedback.priorityHigh"),
      description: t("feedback.priorityHighDesc"),
    },
  ];

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

  const submitFeedbackMutation = useSubmitFeedback();

  // Handle success/error
  useEffect(() => {
    if (submitFeedbackMutation.isSuccess) {
      toast({
        title: t("feedback.toastSubmitted"),
        description: t("feedback.toastSubmittedDesc"),
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

      setIsSubmitting(false);
    }
    if (submitFeedbackMutation.isError) {
      logger.error("Failed to submit feedback:", submitFeedbackMutation.error);
      toast({
        title: t("feedback.toastFailed"),
        description: t("feedback.toastFailedDesc"),
        variant: "destructive",
      });

      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    submitFeedbackMutation.isSuccess,
    submitFeedbackMutation.isError,
    submitFeedbackMutation.error,
  ]);

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);

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

    submitFeedbackMutation.mutate(feedbackData);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {t("feedback.title")}
        </CardTitle>
        <CardDescription>{t("feedback.description")}</CardDescription>
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
                    {t("feedback.typeLabel")}
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {feedbackTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <div
                            key={type.value}
                            className={`relative cursor-pointer rounded-lg border p-4 transition-all hover:border-border ${
                              field.value === type.value
                                ? "border-primary bg-primary/10"
                                : "border-border bg-card"
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
                                <p className="text-xs text-muted-foreground mt-1">
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
                  <FormLabel>{t("feedback.category")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("feedback.selectCategory")}
                        />
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
                  <FormLabel>{t("feedback.titleLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("feedback.titlePlaceholder")}
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {`${field.value?.length || 0}/100 ${t("feedback.characters")}`}
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
                  <FormLabel>{t("feedback.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("feedback.descriptionPlaceholder")}
                      rows={4}
                      maxLength={1000}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {`${field.value?.length || 0}/1000 ${t("feedback.characters")}`}
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
                  <FormLabel>{t("feedback.priority")}</FormLabel>
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
                            <span className="text-xs text-muted-foreground">
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
                  <FormLabel>{t("feedback.emailOptional")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("feedback.emailHelp")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              className="w-full btn-primary"
            >
              {isSubmitting
                ? t("feedback.submitting")
                : t("feedback.submitFeedback")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
