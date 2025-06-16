import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentEnvironment } from "@/lib/alerts-feature-flag";

interface ComingSoonPageProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  title = "Alerts Dashboard",
  description = "Advanced monitoring and alerting capabilities for your RabbitMQ infrastructure.",
  showBackButton = true,
}) => {
  const navigate = useNavigate();
  const environment = getCurrentEnvironment();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <Construction className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {title}
          </CardTitle>
          <div className="flex justify-center mt-2">
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-800"
            >
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 leading-relaxed">{description}</p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              {environment === "development" ? (
                <>
                  <strong>Development Mode:</strong> This feature is accessible
                  in development but marked as "Coming Soon" for production
                  users.
                  <span className="block mt-1 text-xs">
                    Current environment:{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      {environment}
                    </code>
                  </span>
                </>
              ) : (
                <>
                  <strong>For developers:</strong> This feature is available in
                  development mode.
                  <span className="block mt-1 text-xs">
                    Current environment:{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      {environment}
                    </code>
                  </span>
                </>
              )}
            </p>
          </div>
          {showBackButton && (
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoonPage;
