import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VHost } from "@/lib/api/vhostTypes";

interface DeleteVHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  vhost: VHost;
  onConfirm: () => void;
  isLoading: boolean;
}

export function DeleteVHostModal({
  isOpen,
  onClose,
  vhost,
  onConfirm,
  isLoading,
}: DeleteVHostModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Virtual Host
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete the virtual host{" "}
              <strong>{vhost.name === "/" ? "Default" : vhost.name}</strong>?
            </p>
            <p className="text-red-600 font-medium">
              This action cannot be undone. All queues, exchanges, and data in
              this virtual host will be permanently deleted.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete Virtual Host"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
