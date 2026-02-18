import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import {
  Edit,
  Loader2,
  Server as ServerIcon,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Server } from "@/lib/api/types";
import { logger } from "@/lib/logger";

import { AddServerForm } from "@/components/AddServerFormComponent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteServer, useServers } from "@/hooks/queries/useServer";
import { useUser } from "@/hooks/ui/useUser";

interface ServerManagementProps {
  trigger?: React.ReactNode;
}

export function ServerManagement({ trigger }: ServerManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: serversData, refetch } = useServers();
  const servers = serversData?.servers || [];

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Settings className="h-4 w-4" />
      Manage Servers
    </Button>
  );

  const handleServerAction = async () => {
    await refetch();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Server Management
          </DialogTitle>
          <DialogDescription>
            Edit, or remove RabbitMQ server connections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Server Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Your Servers</h3>
          </div>

          {/* Server List */}
          {servers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ServerIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No servers configured</p>
              <p className="text-sm">
                Add your first RabbitMQ server to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onServerUpdated={handleServerAction}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ServerCardProps {
  server: Server;
  onServerUpdated: () => void;
}

function ServerCard({ server, onServerUpdated }: ServerCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { selectedServerId, setSelectedServerId } = useServerContext();
  const { refetchPlan } = useUser();
  const deleteServerMutation = useDeleteServer();
  const navigate = useNavigate();
  const params = useParams<{ serverId?: string }>();

  const handleDeleteServer = async () => {
    try {
      await deleteServerMutation.mutateAsync(server.id);

      // Refetch plan data to update server count/limits
      await refetchPlan();

      // If the deleted server was selected, clear the selection
      if (selectedServerId === server.id) {
        setSelectedServerId(null);
      }

      // If the current page has the deleted serverId in the URL, navigate away
      if (params.serverId === server.id) {
        navigate("/");
      }

      toast.success(`Server "${server.name}" has been deleted successfully`);
      setIsDeleteDialogOpen(false);
      onServerUpdated();
    } catch (error) {
      toast.error("Failed to delete server. Please try again.");
      logger.error("Delete server error:", error);
    }
  };

  const handleServerUpdated = () => {
    setIsEditDialogOpen(false);
    onServerUpdated();
    toast.success(`Server "${server.name}" has been updated successfully`);
  };
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white-100 rounded-lg">
          <ServerIcon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{server.name}</h4>
          </div>
          <p className="text-sm text-gray-500">
            {server.username}@{server.host}:{server.port} ({server.vhost})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditDialogOpen(true)}
          className="text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Edit Server"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Delete Server"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Edit Server Dialog */}
      <AddServerForm
        mode="edit"
        server={server}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onServerUpdated={handleServerUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Server
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the server{" "}
              <strong>"{server.name}"</strong>?
            </AlertDialogDescription>
            <div className="space-y-2 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <ServerIcon className="h-4 w-4" />
                  <span>
                    {server.host}:{server.port} ({server.vhost})
                  </span>
                </div>
              </div>
              <p className="text-red-600 font-medium text-sm">
                This action cannot be undone. All associated data and
                configurations will be permanently removed.
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteServer}
              disabled={deleteServerMutation.isPending}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deleteServerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Server
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
