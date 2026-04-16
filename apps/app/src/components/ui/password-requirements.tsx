import { useTranslation } from "react-i18next";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { PixelX } from "@/components/ui/pixel-x";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

function PasswordRequirements({
  password,
  className,
}: PasswordRequirementsProps) {
  const { t } = useTranslation("auth");
  const hasInput = password.length > 0;

  const requirements = [
    { key: "req8Chars", test: (pwd: string) => pwd.length >= 8 },
    { key: "reqLowercase", test: (pwd: string) => /[a-z]/.test(pwd) },
    { key: "reqUppercase", test: (pwd: string) => /[A-Z]/.test(pwd) },
    { key: "reqNumber", test: (pwd: string) => /[0-9]/.test(pwd) },
    { key: "reqSpecial", test: (pwd: string) => /[^a-zA-Z0-9]/.test(pwd) },
  ];

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs font-medium text-muted-foreground">
        {t("passwordRequirements")}
      </p>
      <div className="space-y-1">
        {requirements.map(({ key, test }) => {
          const isValid = test(password);
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              {hasInput ? (
                isValid ? (
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                ) : (
                  <PixelX className="h-3.5 w-auto shrink-0 text-destructive" />
                )
              ) : (
                <span className="h-3.5 w-3.5 flex items-center justify-center shrink-0">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                </span>
              )}
              <span
                className={cn(
                  hasInput && isValid
                    ? "text-success"
                    : hasInput && !isValid
                      ? "text-destructive"
                      : "text-muted-foreground"
                )}
              >
                {t(`passwordReq.${key}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PasswordRequirements };
