import React from "react";

import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  className,
}) => {
  const requirements = [
    {
      text: "At least 8 characters",
      test: (pwd: string) => pwd.length >= 8,
    },
    {
      text: "At least one lowercase letter",
      test: (pwd: string) => /[a-z]/.test(pwd),
    },
    {
      text: "At least one uppercase letter",
      test: (pwd: string) => /[A-Z]/.test(pwd),
    },
    {
      text: "At least one number",
      test: (pwd: string) => /[0-9]/.test(pwd),
    },
    {
      text: "At least one special character",
      test: (pwd: string) => /[^a-zA-Z0-9]/.test(pwd),
    },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">
        Password requirements:
      </p>
      <div className="space-y-1">
        {requirements.map((requirement, index) => {
          const isValid = requirement.test(password);
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              {isValid ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-400" />
              )}
              <span
                className={cn(
                  isValid ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {requirement.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { PasswordRequirements };
