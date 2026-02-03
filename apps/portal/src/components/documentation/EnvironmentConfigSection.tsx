import { FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Heading } from "@/components/ui/heading";

import { envExampleContent } from "@/constants/documentation.constants";

export function EnvironmentConfigSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <Heading level={3} id="environment-config">
            Environment Configuration
          </Heading>
        </CardTitle>
        <CardDescription>
          Environment variables template - copy this to .env and update with
          your values
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CodeBlock
          code={envExampleContent}
          language="bash"
          filename=".env.selfhosted.example"
        />
      </CardContent>
    </Card>
  );
}
