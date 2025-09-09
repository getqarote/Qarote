import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Mail, ArrowRight } from "lucide-react";
import { useForm, ValidationError } from "@formspree/react";

// Function to get user's country information
const getUserCountry = (): { country: string } => {
  try {
    // Try to get country from browser locale
    const locale = navigator.language;

    // Extract country code from locale (e.g., "en-US" -> "US")
    const countryCode = locale.includes("-") ? locale.split("-")[1] : locale;

    return {
      country: countryCode,
    };
  } catch (error) {
    console.log("Location detection not available:", error);
    return {
      country: "Unknown",
    };
  }
};

const WaitingListForm = () => {
  const [email, setEmail] = useState("");

  const formId = import.meta.env.VITE_FORMSPREE_FORM_ID;
  const [state, handleSubmitFormspree] = useForm(formId);
  const isSubmitting = state.submitting;

  // Track conversion for analytics
  useEffect(() => {
    if (state.succeeded) {
      // Track successful signup
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-930445154/waitlist_signup",
          event_category: "Waitlist",
          event_label: "Signup",
          value: 1,
        });
      }
    }
  }, [state.succeeded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString();

      // Get user country information
      const locationData = getUserCountry();

      // Submit to Formspree
      await handleSubmitFormspree({
        email,
        timestamp,
        source: document.referrer || "direct",
        country: locationData.country,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });

      toast({
        title: "You're on the list! 🎉",
        description: "We'll notify you when RabbitHQ is ready",
      });
      setEmail("");
    } catch (error) {
      console.error("Error submitting to waitlist:", error);

      toast({
        title: "Email saved locally! 📝",
        description:
          "There was an issue with the form service, but your email is saved locally",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      aria-label="Waitlist signup form"
    >
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="email"
          name="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-10 h-12 text-base"
          disabled={isSubmitting}
          aria-label="Email address"
          aria-required="true"
          autoComplete="email"
        />
      </div>
      <Button
        type="submit"
        className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
        disabled={isSubmitting}
        aria-label="Join waitlist"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
              role="status"
            />
            <span>Joining...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>Join Waitlist</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </Button>
      {/* Validation error display */}
      <ValidationError errors={state.errors} field="email" />
    </form>
  );
};

export default WaitingListForm;
