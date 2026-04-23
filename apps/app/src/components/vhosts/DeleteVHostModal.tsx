import { VHost } from "@/lib/api/vhostTypes";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
          <DialogTitle className="text-destructive">
            Delete Virtual Host
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete the virtual host{" "}
              <strong>{vhost.name === "/" ? "Default" : vhost.name}</strong>?
            </p>
            <p className="text-destructive font-medium">
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
            variant="destructive-outline"
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
