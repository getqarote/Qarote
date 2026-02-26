import { useTranslation } from "react-i18next";

import { CodeBlock } from "@/components/ui/code-block";

import { envExampleContent } from "@/constants/documentation.constants";

export function EnvironmentConfigSection() {
  const { t } = useTranslation("docs");

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {t("envConfig.description")}
      </p>
      <CodeBlock
        code={envExampleContent}
        language="bash"
        filename=".env.selfhosted.example"
      />
    </div>
  );
}
