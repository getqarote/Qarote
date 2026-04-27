import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLock } from "@/components/ui/FieldLock";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const TIME_GROUPS = [
  { label: "00–05", hours: [0, 1, 2, 3, 4, 5] },
  { label: "06–11", hours: [6, 7, 8, 9, 10, 11] },
  { label: "12–17", hours: [12, 13, 14, 15, 16, 17] },
  { label: "18–23", hours: [18, 19, 20, 21, 22, 23] },
] as const;

function toTimeValue(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatUTC(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function computeNextDigest(
  frequency: "daily" | "weekly",
  scheduledTime: string,
  weeklyDay: number
): string {
  const [h = 8, m = 0] = scheduledTime.split(":").map(Number);
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0)
  );

  if (frequency === "daily") {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  } else {
    const current = next.getUTCDay();
    let daysUntil = (weeklyDay - current + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setUTCDate(next.getUTCDate() + daysUntil);
  }

  const dateStr = next.toLocaleDateString(undefined, {
    weekday: frequency === "weekly" ? "long" : "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${dateStr} at ${scheduledTime} UTC`;
}

const DigestSection = () => {
  const { t } = useTranslation("digest");
  const { userPlan } = useUser();
  const isEE =
    userPlan === UserPlan.DEVELOPER || userPlan === UserPlan.ENTERPRISE;

  const {
    data: settings,
    isLoading,
    isError,
    refetch,
  } = trpc.workspace.digest.getSettings.useQuery();

  const updateMutation = trpc.workspace.digest.updateSettings.useMutation({
    onSuccess: () => {
      toast.success(t("saveSuccess", "Settings saved"));
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || t("saveError", "Failed to save settings"));
    },
  });

  const testMutation = trpc.workspace.digest.sendTestDigest.useMutation({
    onSuccess: () => toast.success(t("testDigest.success")),
    onError: (err) => toast.error(err.message || t("testDigest.error")),
  });

  const [localFrequency, setLocalFrequency] = useState<"daily" | "weekly">(
    "daily"
  );
  const [localScheduledTime, setLocalScheduledTime] = useState("08:00");
  const [localWeeklyDay, setLocalWeeklyDay] = useState(1);

  useEffect(() => {
    if (settings) {
      setLocalFrequency(settings.frequency);
      setLocalScheduledTime(settings.scheduledTime);
      setLocalWeeklyDay(settings.weeklyDay ?? 1);
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          {t("loadError", "Failed to load digest settings.")}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("retry", "Retry")}
        </Button>
      </div>
    );
  }

  const handleToggle = (enabled: boolean) => {
    updateMutation.mutate({ enabled });
  };

  const handleSaveSchedule = () => {
    updateMutation.mutate({
      frequency: localFrequency,
      scheduledTime: localScheduledTime,
      ...(localFrequency === "weekly" && { weeklyDay: localWeeklyDay }),
    });
  };

  const isDirty =
    localFrequency !== settings.frequency ||
    localScheduledTime !== settings.scheduledTime ||
    localWeeklyDay !== (settings.weeklyDay ?? 1);

  const nextDigest = settings.enabled
    ? computeNextDigest(
        isDirty ? localFrequency : settings.frequency,
        isDirty ? localScheduledTime : settings.scheduledTime,
        isDirty ? localWeeklyDay : (settings.weeklyDay ?? 1)
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-xl font-semibold">{t("title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-prose">
          {t("description")}
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-prose">
          {t(
            "digestContains",
            "Includes queue depths, consumer counts, message rates, and any active alerts across all your brokers."
          )}
        </p>
      </div>

      {/* Enable — inline toggle row, no card */}
      <div className="flex items-center justify-between py-3 border-b">
        <p id="digest-enable-title" className="text-sm font-medium">
          {t("enable")}
        </p>
        <Switch
          aria-labelledby="digest-enable-title"
          checked={settings.enabled}
          onCheckedChange={handleToggle}
          disabled={updateMutation.isPending}
        />
      </div>

      {settings.enabled && (
        <>
          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("whenToSend")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="digest-frequency">
                    {t("frequency.label")}
                  </Label>
                  {isEE ? (
                    <Select
                      value={localFrequency}
                      onValueChange={(v) =>
                        setLocalFrequency(v as "daily" | "weekly")
                      }
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger id="digest-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">
                          {t("frequency.daily")}
                        </SelectItem>
                        <SelectItem value="weekly">
                          {t("frequency.weekly")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <FieldLock feature="digest_customization">
                      <Select disabled value="daily">
                        <SelectTrigger id="digest-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">
                            {t("frequency.daily")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldLock>
                  )}
                </div>

                {/* Delivery time */}
                <div className="space-y-2">
                  <Label htmlFor="digest-time">{t("scheduledTime")}</Label>
                  {isEE ? (
                    <Select
                      value={localScheduledTime}
                      onValueChange={setLocalScheduledTime}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger id="digest-time" className="font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_GROUPS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.hours.map((h) => {
                              const val = toTimeValue(h);
                              return (
                                <SelectItem
                                  key={val}
                                  value={val}
                                  className="font-mono"
                                >
                                  {val} UTC
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FieldLock feature="digest_customization">
                      <Select disabled value="08:00">
                        <SelectTrigger id="digest-time" className="font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="08:00" className="font-mono">
                            08:00 UTC
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldLock>
                  )}
                </div>
              </div>

              {/* Day of week (weekly only) */}
              {isEE && localFrequency === "weekly" && (
                <div className="space-y-2">
                  <Label htmlFor="digest-day">{t("dayOfWeek")}</Label>
                  <Select
                    value={String(localWeeklyDay)}
                    onValueChange={(v) => setLocalWeeklyDay(parseInt(v, 10))}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger id="digest-day" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_KEYS.map((key, i) => (
                        <SelectItem key={key} value={String(i)}>
                          {t(`days.${key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Save — EE only; free tier schedule is locked */}
              {isEE && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={handleSaveSchedule}
                    disabled={!isDirty || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("saving", "Saving…")}
                      </>
                    ) : (
                      t("saveSchedule", "Save schedule")
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions & status */}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("testDigest.sending")}
                </>
              ) : (
                t("testDigest.button")
              )}
            </Button>

            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-muted-foreground">
                {settings.lastSentAt ? (
                  <>
                    {t("lastDigest.label")}:{" "}
                    <span className="font-mono">
                      {formatUTC(new Date(settings.lastSentAt))} UTC
                    </span>
                  </>
                ) : (
                  t("lastDigest.neverSent")
                )}
              </span>
              {nextDigest && (
                <span className="text-sm text-muted-foreground">
                  {t("nextDigest", "Next")}:{" "}
                  <span className="font-mono">{nextDigest}</span>
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DigestSection;
