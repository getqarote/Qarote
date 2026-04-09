import { useState } from "react";
import { type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRequirements } from "@/components/ui/password-requirements";

import type { AcceptInvitationFormData } from "@/schemas";

interface InviteAcceptanceFormProps {
  form: UseFormReturn<AcceptInvitationFormData>;
  /** Email of the invited user — rendered as a disabled readonly field */
  email: string;
  isPending: boolean;
  onSubmit: (data: AcceptInvitationFormData) => void;
  /**
   * Optional callback rendered as a "Sign in instead" text link below
   * the submit button. When omitted, the link is hidden — useful for
   * contexts where sign-in is handled via a different affordance
   * (e.g. the existing-user branch of AcceptOrgInvitation).
   */
  onNavigateSignIn?: () => void;
}

/**
 * Shared first-name / last-name / email / password / confirm-password
 * form used by both `AcceptInvitation` and `AcceptOrgInvitation`. The
 * two originally had ~130 lines of identical JSX that differed only
 * in which mutation they called on submit.
 *
 * The parent owns the `useForm` instance (so it controls validation
 * schemas and default values), and passes it down via `form` — this
 * keeps the form component presentational and lets both pages share
 * it without coupling to either one's submit handler.
 *
 * Password visibility toggles live here as local state because they're
 * pure UI concerns with no external consequences.
 */
export function InviteAcceptanceForm({
  form,
  email,
  isPending,
  onSubmit,
  onNavigateSignIn,
}: InviteAcceptanceFormProps) {
  const { t } = useTranslation("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("firstName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("firstNamePlaceholder")}
                      disabled={isPending}
                      autoComplete="given-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lastName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("lastNamePlaceholder")}
                      disabled={isPending}
                      autoComplete="family-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <FormLabel>{t("email")}</FormLabel>
            <Input
              type="email"
              value={email}
              disabled
              className="bg-muted"
              autoComplete="username"
              readOnly
            />
          </div>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("password")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("enterYourPassword")}
                    disabled={isPending}
                    showPassword={showPassword}
                    onToggleVisibility={() => setShowPassword(!showPassword)}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <PasswordRequirements
                  password={field.value || ""}
                  className="mt-2"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("confirmPassword")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("confirmYourPassword")}
                    disabled={isPending}
                    showPassword={showConfirmPassword}
                    onToggleVisibility={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin mr-2"
                  aria-hidden="true"
                />
                {t("creatingAccount")}
              </>
            ) : (
              t("acceptInvitationAndCreate")
            )}
          </Button>
        </form>
      </Form>

      {onNavigateSignIn && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <button
              type="button"
              onClick={onNavigateSignIn}
              className="text-primary hover:underline underline-offset-2 font-medium"
            >
              {t("signInInstead")}
            </button>
          </p>
        </div>
      )}
    </>
  );
}
