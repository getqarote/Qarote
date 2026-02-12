import { CodeBlock } from "@/components/ui/code-block";

import { envExampleContent } from "@/constants/documentation.constants";

export function EnvironmentConfigSection() {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Environment variables template - copy this to .env and update with your
        values
      </p>
      <CodeBlock
        code={envExampleContent}
        language="bash"
        filename=".env.selfhosted.example"
      />
    </div>
  );
}
