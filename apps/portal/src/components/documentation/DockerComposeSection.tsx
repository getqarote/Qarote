import { FileCode } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { dockerComposeContent } from "@/constants/documentation.constants";

export function DockerComposeSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          <Heading level={3} id="docker-compose">
            Docker Compose File
          </Heading>
        </CardTitle>
        <CardDescription>
          Production-ready Docker Compose configuration for both Community and
          Enterprise editions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="docker-compose" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="docker-compose">Docker Compose</TabsTrigger>
          </TabsList>
          <TabsContent value="docker-compose" className="mt-4">
            <CodeBlock
              code={dockerComposeContent}
              language="yaml"
              filename="docker-compose.selfhosted.yml"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
