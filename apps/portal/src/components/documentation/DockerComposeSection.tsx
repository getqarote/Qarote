import { CodeBlock } from "@/components/ui/code-block";

import { dockerComposeContent } from "@/constants/documentation.constants";

export function DockerComposeSection() {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Production-ready Docker Compose configuration for both Community and
        Enterprise editions
      </p>
      <CodeBlock
        code={dockerComposeContent}
        language="yaml"
        filename="docker-compose.selfhosted.yml"
      />
    </div>
  );
}
