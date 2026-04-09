import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SetVHostPermissionsFormProps {
  users: Array<{ name: string }>;
  selectedUser: string;
  onSelectedUserChange: (user: string) => void;
  configureRegexp: string;
  onConfigureRegexpChange: (value: string) => void;
  writeRegexp: string;
  onWriteRegexpChange: (value: string) => void;
  readRegexp: string;
  onReadRegexpChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function SetVHostPermissionsForm({
  users,
  selectedUser,
  onSelectedUserChange,
  configureRegexp,
  onConfigureRegexpChange,
  writeRegexp,
  onWriteRegexpChange,
  readRegexp,
  onReadRegexpChange,
  onSubmit,
  isPending,
}: SetVHostPermissionsFormProps) {
  const { t } = useTranslation("vhosts");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section">{t("setPermission")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("user")}
            </label>
            <Select
              value={selectedUser}
              onValueChange={onSelectedUserChange}
              disabled={users.length === 0}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.name} value={user.name}>
                      {user.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="admin">admin</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("configureRegexp")}
            </label>
            <Input
              value={configureRegexp}
              onChange={(e) => onConfigureRegexpChange(e.target.value)}
              placeholder=".*"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("writeRegexp")}
            </label>
            <Input
              value={writeRegexp}
              onChange={(e) => onWriteRegexpChange(e.target.value)}
              placeholder=".*"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("readRegexp")}
            </label>
            <Input
              value={readRegexp}
              onChange={(e) => onReadRegexpChange(e.target.value)}
              placeholder=".*"
            />
          </div>
          <div>
            <Button
              className="btn-primary"
              onClick={onSubmit}
              disabled={isPending}
            >
              {isPending ? t("setting") : t("setPermission")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
