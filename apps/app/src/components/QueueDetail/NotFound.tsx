import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";

interface NotFoundProps {
  title: string;
  description: string;
  onNavigateBack: () => void;
}

export function NotFound({
  title,
  description,
  onNavigateBack,
}: NotFoundProps) {
  return (
    <div className="text-center py-12">
      <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-2xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground mb-4">{description}</p>
      <Button onClick={onNavigateBack}>Back</Button>
    </div>
  );
}
