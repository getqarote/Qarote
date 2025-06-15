import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server } from "lucide-react";
import { AddServerForm } from "@/components/AddServerForm";

interface NoServerConfiguredProps {
  title: string;
  subtitle: string;
  description: string;
}

export function NoServerConfigured({
  title,
  subtitle,
  description,
}: NoServerConfiguredProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-gray-500">{subtitle}</p>
        </div>
      </div>
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center">
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No RabbitMQ Server Configured
            </h2>
            <p className="text-gray-600 mb-4">{description}</p>
            <AddServerForm
              trigger={
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Add Server
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
