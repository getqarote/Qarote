import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export const NoWorkspaceCard = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium">No Workspace Associated</p>
        <p className="text-sm text-muted-foreground">
          You are not currently associated with any workspace.
        </p>
      </CardContent>
    </Card>
  );
};
