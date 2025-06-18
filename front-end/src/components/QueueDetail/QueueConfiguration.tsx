import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { Queue } from "@/lib/api";

interface QueueConfigurationProps {
  queue: Queue;
}

export function QueueConfiguration({ queue }: QueueConfigurationProps) {
  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Queue Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">VHost</p>
            <Badge variant="outline" className="font-mono">
              {queue.vhost}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600">Node</p>
            <Badge variant="outline" className="font-mono">
              {queue.node}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600">Type</p>
            <Badge variant="outline">{queue.type}</Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600">State</p>
            <Badge className="bg-green-100 text-green-700">{queue.state}</Badge>
          </div>
        </div>
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Durable</span>
              <Badge variant={queue.durable ? "default" : "outline"}>
                {queue.durable ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Auto Delete</span>
              <Badge variant={queue.auto_delete ? "destructive" : "outline"}>
                {queue.auto_delete ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Exclusive</span>
              <Badge variant={queue.exclusive ? "default" : "outline"}>
                {queue.exclusive ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Policy</span>
              <Badge variant="outline">{queue.policy || "None"}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
