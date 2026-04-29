import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";

import { trackSignUp } from "@/lib/ga";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { SSOLoginButton } from "@/components/auth/SSOLoginButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
import { PixelCheck } from "@/components/ui/pixel-check";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { usePublicConfig } from "@/hooks/queries/usePublicConfig";
import { useShowAlternativeAuth } from "@/hooks/queries/useSsoConfig";
import { useRegister } from "@/hooks/ui/useAuth";

import {
  REFERRAL_SOURCES,
  type ReferralSource,
  type SignUpFormData,
  signUpSchema,
} from "@/schemas";

/**
 * Sign-up page. Three render states:
 *
 *   1. Registration disabled — warning alert with "Go to sign-in" fallback
 *   2. Success — success alert with "Go to sign-in" CTA
 *   3. Form mode — full registration form with attribution questions
 *
 * Design:
 * - No icon badge — typographic header carries hierarchy on its own.
 * - Bricolage Grotesque heading with a Fragment Mono orange eyebrow.
 * - Form sectioned: account fields / optional attribution / legal.
 * - Staggered entrance animation (respects prefers-reduced-motion).
 * - Attribution: Popover+Command combobox for referral source; discovery
 *   query revealed only for search/AI sources via grid-template-rows.
 * - Submit button reveals → on hover; terms label brightens on check.
 */
const SignUp = () => {
  const { t } = useTranslation("auth");
  const { isAuthenticated } = useAuth();
  const registerMutation = useRegister();
  const location = useLocation();
  const navigate = useNavigate();
  const { showAlternativeAuth } = useShowAlternativeAuth();
  const { data: publicConfig } = usePublicConfig();

  const from = location.state?.from?.pathname || "/";

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      referralSource: undefined,
      discoveryQuery: "",
    },
  });

  const acceptTermsValue = form.watch("acceptTerms");
  const referralSourceValue = form.watch("referralSource");
  const showDiscoveryQuery =
    referralSourceValue !== undefined &&
    SEARCH_AI_KEYS.has(referralSourceValue);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (registerMutation.isSuccess && registerMutation.data) {
      trackSignUp({
        method: "email",
        email: registerMutation.data.email,
      });
    }
  }, [registerMutation.isSuccess, registerMutation.data]);

  const onSubmit = (data: SignUpFormData) => {
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      acceptTerms: data.acceptTerms,
      referralSource: data.referralSource || undefined,
      discoveryQuery: data.discoveryQuery || undefined,
    });
  };

  const isDisabled = publicConfig?.registrationEnabled === false;
  const isSuccess = registerMutation.isSuccess;

  return (
    <AuthPageWrapper>
      {/* ── Entrance animation ────────────────────────────────────── */}
      <style>{`
        @keyframes su-field-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .su-in {
          animation: su-field-in 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .su-in { animation: none !important; }
        }
      `}</style>

      {/* ── Header — no icon badge ────────────────────────────────── */}
      <CardHeader className="px-8 pt-8 pb-2 space-y-0">
        <p
          className="su-in text-[10px] tracking-[0.18em] uppercase text-primary font-medium mb-3 select-none"
          style={{ fontFamily: "var(--font-mono)", animationDelay: "0ms" }}
        >
          Qarote
        </p>
        <CardTitle
          className="su-in text-[1.65rem] font-bold tracking-tight leading-[1.15]"
          style={{
            fontFamily: "var(--font-heading)",
            fontOpticalSizing: "auto",
            animationDelay: "40ms",
          }}
        >
          {t("getStarted")}
        </CardTitle>
        <CardDescription
          className="su-in text-sm leading-relaxed mt-2"
          style={{ animationDelay: "80ms" }}
        >
          {t("createAccountDescription")}
        </CardDescription>
      </CardHeader>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <CardContent className="px-8 pb-8 pt-5">
        {isDisabled ? (
          <RegistrationDisabledAlert
            onGoToSignIn={() => navigate("/auth/sign-in")}
          />
        ) : isSuccess ? (
          <RegistrationSuccessAlert
            autoVerified={registerMutation.data?.autoVerified ?? false}
            onGoToSignIn={() => navigate("/auth/sign-in")}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {registerMutation.isError && (
                <Alert variant="destructive" className="su-in">
                  <AlertDescription>
                    {registerMutation.error instanceof Error
                      ? registerMutation.error.message
                      : t("failedCreateAccount")}
                  </AlertDescription>
                </Alert>
              )}

              {/* ── Name row ── */}
              <div
                className="su-in grid grid-cols-2 gap-3"
                style={{ animationDelay: "120ms" }}
              >
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("firstName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("firstNamePlaceholder")}
                          disabled={registerMutation.isPending}
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
                          disabled={registerMutation.isPending}
                          autoComplete="family-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Email ── */}
              <div className="su-in" style={{ animationDelay: "160ms" }}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("emailAddress")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("emailPlaceholder")}
                          disabled={registerMutation.isPending}
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Password ── */}
              <div className="su-in" style={{ animationDelay: "200ms" }}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("password")}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder={t("createAPassword")}
                          disabled={registerMutation.isPending}
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
              </div>

              {/* ── Confirm password ── */}
              <div className="su-in" style={{ animationDelay: "230ms" }}>
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("confirmPassword")}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder={t("confirmYourPassword")}
                          disabled={registerMutation.isPending}
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Attribution section divider ── */}
              <div
                className="su-in space-y-2 pt-1"
                style={{ animationDelay: "260ms" }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span
                    className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground/60 font-medium"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {t("optionalDividerLabel")}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <p className="text-[11px] text-center leading-relaxed text-muted-foreground/60">
                  {t("attributionHelperText")}
                </p>
              </div>

              {/* ── Referral source (Combobox) ── */}
              <div className="su-in" style={{ animationDelay: "290ms" }}>
                <FormField
                  control={form.control}
                  name="referralSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        {t("referralSourceLabel")}
                      </FormLabel>
                      <FormControl>
                        <ReferralSourceCombobox
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={registerMutation.isPending}
                          placeholder={t("referralSourceSelectPlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Discovery query — revealed for search/AI sources ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: showDiscoveryQuery ? "1fr" : "0fr",
                  transition:
                    "grid-template-rows 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <div className="overflow-hidden">
                  <div className="pt-4">
                    <FormField
                      control={form.control}
                      name="discoveryQuery"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            {t("discoveryQueryLabel")}
                          </FormLabel>
                          <FormControl>
                            <DiscoveryQueryCombobox
                              value={field.value ?? ""}
                              onValueChange={field.onChange}
                              disabled={registerMutation.isPending}
                              placeholder={t("discoveryQueryPlaceholder")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* ── Terms ── */}
              <div className="su-in pt-1" style={{ animationDelay: "350ms" }}>
                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem
                      data-testid="accept-terms"
                      className="flex flex-row items-start space-x-3 space-y-0"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel
                          className={`text-sm font-normal transition-colors duration-300 ${
                            acceptTermsValue
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t("agreeToTerms")}{" "}
                          <a
                            href={`${import.meta.env.VITE_WEB_BASE_URL}/terms-of-service/`}
                            className="font-medium text-primary hover:underline underline-offset-2"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t("common:termsOfService")}
                          </a>{" "}
                          {t("andThe")}{" "}
                          <a
                            href={`${import.meta.env.VITE_WEB_BASE_URL}/privacy-policy/`}
                            className="font-medium text-primary hover:underline underline-offset-2"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t("common:privacyPolicy")}
                          </a>
                          .
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Submit ── */}
              <div className="su-in pt-1" style={{ animationDelay: "380ms" }}>
                <Button
                  type="submit"
                  className="w-full btn-primary h-11 group"
                  disabled={registerMutation.isPending}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {registerMutation.isPending
                      ? t("creatingAccount")
                      : t("createAccountButton")}
                    {!registerMutation.isPending && (
                      <span
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    )}
                  </span>
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* ── Alternative auth ── */}
        {!isDisabled && !isSuccess && showAlternativeAuth && (
          <>
            <div className="relative my-6">
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <GoogleLoginButton
                mode="signup"
                onError={(error) => logger.error("Google signup error:", error)}
              />
              <SSOLoginButton
                mode="signup"
                onError={(error) => logger.error("SSO signup error:", error)}
              />
              <p className="text-center text-xs text-muted-foreground">
                {t("socialAuthTermsNotice")}{" "}
                <a
                  href={`${import.meta.env.VITE_WEB_BASE_URL}/terms-of-service/`}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("common:termsOfService")}
                </a>{" "}
                {t("andThe")}{" "}
                <a
                  href={`${import.meta.env.VITE_WEB_BASE_URL}/privacy-policy/`}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("common:privacyPolicy")}
                </a>
                {" · "}
                <a
                  href={`${import.meta.env.VITE_WEB_BASE_URL}/security/`}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("viewSecurity")}
                </a>
                .
              </p>
            </div>
          </>
        )}

        {/* ── Sign-in link ── */}
        {!isSuccess && (
          <p className="pt-4 text-center text-sm text-muted-foreground">
            {t("or")}{" "}
            <Link
              to="/auth/sign-in"
              className="font-medium text-primary hover:underline underline-offset-2"
            >
              {t("signInToExisting")}
            </Link>
          </p>
        )}
      </CardContent>
    </AuthPageWrapper>
  );
};

// ── ReferralSourceCombobox ────────────────────────────────────────────────────

const SEARCH_AI_KEYS = new Set<ReferralSource>(["google", "llm"]);
const SEARCH_AI_SOURCES = REFERRAL_SOURCES.filter((s) => SEARCH_AI_KEYS.has(s));
const COMMUNITY_SOURCES = REFERRAL_SOURCES.filter(
  (s) => !SEARCH_AI_KEYS.has(s) && s !== "other"
);

function ReferralSourceCombobox({
  value,
  onValueChange,
  disabled,
  placeholder,
}: {
  value: ReferralSource | undefined;
  onValueChange: (value: ReferralSource) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const { t } = useTranslation("auth");
  const [open, setOpen] = useState(false);
  const listboxId = useId();

  const selectedLabel = value ? t(`referralSource_${value}`) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "hover:bg-accent/40 transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selectedLabel && "text-muted-foreground"
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <PixelChevronDown
            className={cn(
              "h-3 w-auto shrink-0 opacity-50 ml-2 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandList id={listboxId}>
            <CommandGroup heading={t("referralGroup_searchAi")}>
              {SEARCH_AI_SOURCES.map((src) => (
                <CommandItem
                  key={src}
                  value={src}
                  onSelect={() => {
                    onValueChange(src);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">{t(`referralSource_${src}`)}</span>
                  {value === src && (
                    <PixelCheck className="h-2.5 text-primary ml-2" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={t("referralGroup_community")}>
              {COMMUNITY_SOURCES.map((src) => (
                <CommandItem
                  key={src}
                  value={src}
                  onSelect={() => {
                    onValueChange(src);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">{t(`referralSource_${src}`)}</span>
                  {value === src && (
                    <PixelCheck className="h-2.5 text-primary ml-2" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="other"
                onSelect={() => {
                  onValueChange("other");
                  setOpen(false);
                }}
              >
                <span className="flex-1">{t("referralSource_other")}</span>
                {value === "other" && (
                  <PixelCheck className="h-2.5 text-primary ml-2" />
                )}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── DiscoveryQueryCombobox ────────────────────────────────────────────────────

const DISCOVERY_QUERY_PRESETS = [
  "RabbitMQ management UI alternative",
  "RabbitMQ alerting",
  "RabbitMQ daily digest",
  "RabbitMQ metrics persistence layer",
  "RabbitMQ incident diagnosis engine",
  "RabbitMQ message tracing",
] as const;

function DiscoveryQueryCombobox({
  value,
  onValueChange,
  disabled,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "hover:bg-accent/40 transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <PixelChevronDown
            className={cn(
              "h-3 w-auto shrink-0 opacity-50 ml-2 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <input
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={placeholder}
              value={value}
              onChange={(e) => {
                onValueChange(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
            />
          </div>
          <CommandList id={listboxId}>
            <CommandGroup>
              {DISCOVERY_QUERY_PRESETS.filter((preset) =>
                preset.toLowerCase().includes(value.toLowerCase())
              ).map((preset) => (
                <CommandItem
                  key={preset}
                  value={preset}
                  onSelect={() => {
                    onValueChange(preset);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">{preset}</span>
                  {value === preset && (
                    <PixelCheck className="h-2.5 text-primary ml-2" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Alert sub-components ──────────────────────────────────────────────────────

function RegistrationDisabledAlert({
  onGoToSignIn,
}: {
  onGoToSignIn: () => void;
}) {
  const { t } = useTranslation("auth");
  return (
    <Alert className="border-warning/30 bg-warning-muted">
      <AlertDescription className="text-warning">
        <div className="font-medium mb-2">{t("registrationDisabled")}</div>
        <p className="text-sm mb-3">{t("registrationDisabledDescription")}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onGoToSignIn}
          className="border-warning/40 text-warning hover:bg-warning-muted"
        >
          {t("goToSignIn")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function RegistrationSuccessAlert({
  autoVerified,
  onGoToSignIn,
}: {
  autoVerified: boolean;
  onGoToSignIn: () => void;
}) {
  const { t } = useTranslation("auth");
  return (
    <Alert className="border-success/30 bg-success-muted">
      <AlertDescription className="text-success">
        <div className="font-medium mb-2">{t("accountCreatedSuccess")}</div>
        <p className="text-sm mb-3">
          {autoVerified ? t("accountReadySignIn") : t("verificationEmailSent")}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onGoToSignIn}
          className="border-success/40 text-success hover:bg-success-muted"
        >
          {t("goToSignIn")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default SignUp;
