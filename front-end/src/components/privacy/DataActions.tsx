import { useState } from "react";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import logger from "../../lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alertDialog";
import { useToast } from "@/hooks/useToast";
import { apiClient } from "@/lib/api";
import { CompanyPrivacySettings } from "./types";
import { WorkspacePlan } from "@/types/plans";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface DataActionsProps {
  settings: CompanyPrivacySettings;
  isAdmin: boolean;
  workspaceId: string;
  workspacePlan?: WorkspacePlan; // Keep optional for backward compatibility
}

export function DataActions({
  settings,
  isAdmin,
  workspaceId,
  workspacePlan: propPlan,
}: DataActionsProps) {
  const { toast } = useToast();
  const { canExportData } = useWorkspace();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can export company data",
        variant: "destructive",
      });
      return;
    }

    if (!canExportData) {
      toast({
        title: "Feature Not Available",
        description:
          "Data export is available with Pro plans. Please upgrade to access this feature.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const blob = await apiClient.exportWorkspaceData(workspaceId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `workspace-data-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Workspace data has been exported and downloaded",
      });
    } catch (error) {
      logger.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export workspace data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can delete workspace data",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      await apiClient.deleteWorkspaceData(workspaceId);
      toast({
        title: "Data Deleted",
        description: "All workspace data has been permanently deleted",
      });
    } catch (error) {
      logger.error("Delete failed:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete workspace data",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const hasStoredData = settings.storageMode !== "MEMORY_ONLY";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Data Management
          {!canExportData && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
              Pro
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Export or delete your workspace's stored data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasStoredData && (
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            📋 No data is currently being stored. All operations are performed
            in real-time.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 ${
              !canExportData ? "opacity-60 cursor-not-allowed" : ""
            }`}
            onClick={handleExportData}
            disabled={!isAdmin || exporting || !hasStoredData || !canExportData}
            title={!canExportData ? "Upgrade to export data" : undefined}
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Data"}
            {!canExportData && (
              <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                Pro
              </span>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                disabled={!isAdmin || deleting || !hasStoredData}
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting..." : "Delete All Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Delete All Workspace Data
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  stored data for your workspace, including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Historical metrics and performance data</li>
                    <li>Alert history and notifications</li>
                    <li>Activity logs and audit trails</li>
                    <li>Any cached or temporary data</li>
                  </ul>
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                    <strong>Warning:</strong> This action is irreversible and
                    will affect all users in your workspace.
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllData}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Delete All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {!isAdmin && (
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            🔒 Only administrators can export or delete workspace data.
          </div>
        )}

        {!canExportData && isAdmin && (
          <div className="text-sm text-gray-500 bg-orange-50 p-3 rounded-lg border border-orange-200">
            💎 Data export is available with Pro plans. Data deletion is always
            available for all users.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
