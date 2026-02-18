import { AlertTriangle, ExternalLink, Shield } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RabbitMQPermissionErrorProps {
  requiredPermission: string;
  message: string;
  title?: string;
}

export const RabbitMQPermissionError = ({
  requiredPermission,
  message,
  title = "Insufficient Permissions",
}: RabbitMQPermissionErrorProps) => {
  const handleLearnMore = () => {
    window.open(
      "https://www.rabbitmq.com/docs/management#permissions",
      "_blank"
    );
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-primary/20 bg-primary/5">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            {message}
          </AlertDescription>
        </Alert>

        <div className="bg-white p-4 rounded-lg border border-primary/20">
          <h4 className="font-medium text-gray-900 mb-2">
            Required Permission:
          </h4>
          <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
            {requiredPermission}
          </code>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">What can you do?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Contact your RabbitMQ administrator</li>
            <li>
              • Request the required{" "}
              <code className="bg-blue-100 px-1 rounded">
                {requiredPermission}
              </code>{" "}
              permission
            </li>
            <li>
              • Check your user permissions in the RabbitMQ Management interface
            </li>
          </ul>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleLearnMore}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Learn More About RabbitMQ Permissions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
