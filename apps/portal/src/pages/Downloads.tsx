import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Downloads = () => {
  const downloads = [
    {
      name: "Self-Hosted Deployment",
      description:
        "Docker Compose file for both Community (open-source) and Enterprise (licensed) editions",
      file: "docker-compose.selfhosted.yml",
    },
    {
      name: "Installation Guide",
      description: "Complete setup instructions",
      file: "SELF_HOSTED_DEPLOYMENT.md",
    },
  ];

  const handleDownload = (filename: string) => {
    // In production, these would be actual file downloads
    toast.info(`Downloading ${filename}...`);
    // For now, just show a message
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Downloads</h1>
        <p className="text-muted-foreground mt-2">
          Download self-hosted packages and installation guides
        </p>
      </div>

      <div className="grid gap-4">
        {downloads.map((item) => (
          <Card key={item.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {item.name}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => handleDownload(item.file)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Downloads;
