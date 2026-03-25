import { useTranslation } from "react-i18next";

import { Monitor, Moon, Sun } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useTheme } from "@/contexts/ThemeContext";

const themes = [
  { value: "light" as const, icon: Sun, labelKey: "light" },
  { value: "dark" as const, icon: Moon, labelKey: "dark" },
  { value: "system" as const, icon: Monitor, labelKey: "system" },
];

const AppearanceSection = () => {
  const { t } = useTranslation("appearance");
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>{t("themeTitle")}</CardTitle>
          <CardDescription>{t("themeDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {themes.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  theme === value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    theme === value ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    theme === value ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {t(labelKey)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSection;
