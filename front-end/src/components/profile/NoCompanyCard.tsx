import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export const NoCompanyCard = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium">No Company Associated</p>
        <p className="text-sm text-muted-foreground">
          You are not currently associated with any company.
        </p>
      </CardContent>
    </Card>
  );
};
