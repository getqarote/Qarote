import { useTranslation } from "react-i18next";

import { CodeBlock } from "@/components/ui/code-block";

import { dockerComposeContent } from "@/constants/documentation.constants";

export function DockerComposeSection() {
  const { t } = useTranslation("docs");

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {t("dockerCompose.description")}
      </p>
      <CodeBlock
        code={dockerComposeContent}
        language="yaml"
        filename="docker-compose.selfhosted.yml"
      />
    </div>
  );
}
