import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
}: InviteUserDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Email Address</Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="user@example.com"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({
                  ...inviteForm,
                  email: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteRole">Role</Label>
            <Select
              value={inviteForm.role}
              onValueChange={(value) =>
                setInviteForm({
                  ...inviteForm,
                  role: value as "ADMIN" | "USER", // | "READONLY",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="READONLY">Read Only</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={onInviteUser}
              disabled={isInviting || !inviteForm.email}
            >
              <Plus className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
