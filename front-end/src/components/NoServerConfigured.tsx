import { Server } from "lucide-react";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NoServerConfiguredProps {
  title: string;
  description: string;
}

export function NoServerConfigured({
  title,
  description,
}: NoServerConfiguredProps) {
  return (
    <div className="content-container-large">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="title-page">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No RabbitMQ Server Configured
            </h2>
            <p className="text-muted-foreground mb-4">{description}</p>
            <AddServerForm
              trigger={<Button className="btn-primary">Add Server</Button>}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
