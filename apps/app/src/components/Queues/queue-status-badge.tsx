import { Badge } from "@/components/ui/badge";

export function QueueStatusBadge({ state }: { state: string }) {
  const normalized = (state ?? "").toString().trim().toLowerCase();

  switch (normalized) {
    case "running":
      return (
        <Badge className="bg-success-muted text-success hover:bg-success-muted">
          Running
        </Badge>
      );
    case "down":
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
          Down
        </Badge>
      );
    case "crashed":
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
          Crashed
        </Badge>
      );
    case "stopped":
      return (
        <Badge className="bg-muted text-muted-foreground hover:bg-muted">
          Stopped
        </Badge>
      );
    case "minority":
      return (
        <Badge className="bg-warning-muted text-warning hover:bg-warning-muted">
          Minority
        </Badge>
      );
    default:
      return <Badge variant="outline">{state}</Badge>;
  }
}
