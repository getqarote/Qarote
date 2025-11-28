import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { InviteFormState } from "./profileUtils";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteForm: InviteFormState;
  setInviteForm: (form: InviteFormState) => void;
  onInviteUser: () => void;
  isInviting: boolean;
  canInvite?: boolean;
  maxUsers?: number;
  currentCount?: number;
}

export const InviteUserDialog = ({
  open,
  onOpenChange,
  inviteForm,
  setInviteForm,
  onInviteUser,
  isInviting,
  canInvite = true,
  maxUsers,
  currentCount,
}: InviteUserDialogProps) => {
  const isAtLimit = maxUsers && currentCount && currentCount >= maxUsers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to add a new member to your workspace.
            {maxUsers && (
              <span className="block mt-1 text-sm">
                {currentCount || 0}/{maxUsers} users used
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isAtLimit && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You've reached your user limit ({maxUsers} users). Upgrade your
              plan to invite more users.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, email: e.target.value })
              }
              disabled={isInviting || !canInvite}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={inviteForm.role}
              onValueChange={(value) =>
                setInviteForm({
                  ...inviteForm,
                  role: value as "ADMIN" | "USER",
                })
              }
              disabled={isInviting || !canInvite}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={onInviteUser}
              disabled={
                isInviting ||
                !inviteForm.email ||
                !inviteForm.role ||
                !canInvite
              }
              className="btn-primary"
            >
              {isInviting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
