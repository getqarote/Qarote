import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radioGroup";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  X,
  Calendar,
  Database,
  Users,
  Shield,
  Loader2,
} from "lucide-react";
import { WorkspacePlan } from "@/types/plans";

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => Promise<void>;
  currentPlan: WorkspacePlan;
  periodEnd?: string;
  isLoading?: boolean;
}

const CANCELLATION_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "not_using", label: "Not using it enough" },
  { value: "found_alternative", label: "Found a better alternative" },
  { value: "technical_issues", label: "Technical issues" },
  { value: "downgrading", label: "Downgrading/reducing costs" },
  { value: "business_closed", label: "Business closing/changing" },
  { value: "other", label: "Other reason" },
];

export const CancelSubscriptionModal: React.FC<
  CancelSubscriptionModalProps
> = ({ isOpen, onClose, onConfirm, currentPlan, periodEnd, isLoading }) => {
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [understanding, setUnderstanding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !understanding) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        cancelImmediately,
        reason,
        feedback,
      });
      // Reset form
      setCancelImmediately(false);
      setReason("");
      setFeedback("");
      setUnderstanding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            We're sorry to see you go. Please help us understand your decision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Card */}
          <Card className="border-destructive/20 bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-destructive">
                    Important: What happens when you cancel
                  </h3>
                  <ul className="text-sm text-destructive/80 space-y-1">
                    <li className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Your data will be preserved but access will be limited to
                      Free plan features
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      User access may be restricted based on Free plan limits
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Advanced features like enhanced monitoring and alerts will
                      be disabled
                    </li>
                    <li className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      You can reactivate anytime, but billing will restart
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Timing */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              When should we cancel your subscription?
            </Label>
            <RadioGroup
              value={cancelImmediately ? "immediate" : "period_end"}
              onValueChange={(value) =>
                setCancelImmediately(value === "immediate")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="period_end" id="period_end" />
                <Label htmlFor="period_end" className="flex-1">
                  <div>
                    <div className="font-medium">
                      At the end of current billing period
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Continue using {currentPlan} features until{" "}
                      {formatDate(periodEnd)}
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="immediate" />
                <Label htmlFor="immediate" className="flex-1">
                  <div>
                    <div className="font-medium text-destructive">
                      Cancel immediately
                    </div>
                    <div className="text-sm text-destructive/80">
                      Downgrade to Free plan now (no refund for remaining
                      period)
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Why are you canceling? <span className="text-destructive">*</span>
            </Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {CANCELLATION_REASONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-base font-medium">
              Additional feedback (optional)
            </Label>
            <Textarea
              id="feedback"
              placeholder="Help us improve by sharing what could have made you stay, or any issues you encountered..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="understanding"
              checked={understanding}
              onCheckedChange={(checked) =>
                setUnderstanding(checked as boolean)
              }
            />
            <Label htmlFor="understanding" className="text-sm leading-5">
              I understand that canceling my subscription will{" "}
              {cancelImmediately ? "immediately" : "eventually"} limit my access
              to {currentPlan} plan features and I may lose access to advanced
              monitoring, alerts, and other premium features.
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || !understanding || isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Canceling...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                {cancelImmediately ? "Cancel Now" : "Cancel at Period End"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
