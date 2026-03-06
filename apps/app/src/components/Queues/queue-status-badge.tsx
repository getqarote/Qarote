import { Badge } from "@/components/ui/badge";

export function QueueStatusBadge({ state }: { state: string }) {
  const normalized = (state ?? "").toString().trim().toLowerCase();

  switch (normalized) {
    case "running":
      return <Badge className="bg-green-100 text-green-700">Running</Badge>;
    case "down":
      return <Badge className="bg-red-100 text-red-700">Down</Badge>;
    case "crashed":
      return <Badge className="bg-red-100 text-red-700">Crashed</Badge>;
    case "stopped":
      return <Badge className="bg-gray-100 text-gray-700">Stopped</Badge>;
    case "minority":
      return <Badge className="bg-yellow-100 text-yellow-700">Minority</Badge>;
    default:
      return <Badge variant="outline">{state}</Badge>;
  }
}
