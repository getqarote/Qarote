import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Download, Upload } from "lucide-react";

import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import {
  useExportDefinitions,
  useImportDefinitions,
} from "@/hooks/queries/useDefinitions";
import { useToast } from "@/hooks/ui/useToast";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const ALL_VHOSTS_VALUE = "__all__";

const Definitions = () => {
  const { t } = useTranslation("definitions");
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const { selectedServerId, hasServers } = useServerContext();
  const { availableVHosts } = useVHostContext();

  // --- Export state ---
  const today = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();
  const [exportFilename, setExportFilename] = useState(
    `rabbit_definitions_${today}`
  );
  const [exportVhost, setExportVhost] = useState<string>(ALL_VHOSTS_VALUE);

  const vhostForExport =
    exportVhost === ALL_VHOSTS_VALUE ? undefined : exportVhost;

  const {
    refetch: fetchDefinitions,
    isFetching: isExporting,
    error: exportError,
  } = useExportDefinitions(selectedServerId, vhostForExport);

  const handleExport = async () => {
    const result = await fetchDefinitions();
    if (!result.data) return;

    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename.endsWith(".json")
      ? exportFilename
      : `${exportFilename}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // --- Import state ---
  const [importVhost, setImportVhost] = useState<string>(ALL_VHOSTS_VALUE);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportDefinitions();

  const vhostForImport =
    importVhost === ALL_VHOSTS_VALUE ? undefined : importVhost;

  const handleImportConfirm = async () => {
    if (!importFile || !selectedServerId) return;

    importMutation.reset();
    setShowConfirmDialog(false);

    const text = await importFile.text();
    let definitions: unknown;
    try {
      definitions = JSON.parse(text);
    } catch {
      toast({
        title: t("common:error"),
        description: t("import.parseError"),
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({
      serverId: selectedServerId,
      workspaceId: workspace?.id ?? "",
      vhost: vhostForImport,
      definitions,
    });
  };

  if (!hasServers) {
    return (
      <PageShell bare>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
        </div>
        <NoServerConfigured
          title={t("noServerTitle")}
          subtitle={t("pageSubtitle")}
          description={t("noServerDescription")}
        />
      </PageShell>
    );
  }

  if (!selectedServerId) {
    return (
      <PageShell>
        <NoServerSelectedCard
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
          heading={t("noServerTitle")}
          description={t("selectServerPrompt")}
        />
      </PageShell>
    );
  }

  if (exportError) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="title-page">{t("pageTitle")}</h1>
          </div>
        </div>
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="title-page">{t("pageTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("pageSubtitle")}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              {t("export.title")}
            </CardTitle>
            <CardDescription>{t("export.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-filename">
                {t("export.filenameLabel")}
              </Label>
              <Input
                id="export-filename"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder={t("export.filenamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-vhost">{t("export.vhostLabel")}</Label>
              <Select value={exportVhost} onValueChange={setExportVhost}>
                <SelectTrigger id="export-vhost">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VHOSTS_VALUE}>
                    {t("allVhosts")}
                  </SelectItem>
                  {availableVHosts.map((vhost) => (
                    <SelectItem key={vhost.name} value={vhost.name}>
                      {vhost.name === "/" ? t("common:default") : vhost.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting || !exportFilename.trim()}
              className="w-full"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isExporting
                ? t("export.downloading")
                : t("export.downloadButton")}
            </Button>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              {t("import.title")}
            </CardTitle>
            <CardDescription>{t("import.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">{t("import.fileLabel")}</Label>
              <Input
                id="import-file"
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] ?? null);
                  importMutation.reset();
                }}
                className="cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-vhost">{t("import.vhostLabel")}</Label>
              <Select value={importVhost} onValueChange={setImportVhost}>
                <SelectTrigger id="import-vhost">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VHOSTS_VALUE}>
                    {t("allVhosts")}
                  </SelectItem>
                  {availableVHosts.map((vhost) => (
                    <SelectItem key={vhost.name} value={vhost.name}>
                      {vhost.name === "/" ? t("common:default") : vhost.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {importMutation.isSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {t("import.successMessage")}
              </p>
            )}

            {importMutation.isError && (
              <p className="text-sm text-destructive">
                {t("import.errorMessage")}
              </p>
            )}

            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(true)}
              disabled={!importFile || importMutation.isPending}
              className="w-full"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {importMutation.isPending
                ? t("import.uploading")
                : t("import.uploadButton")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import confirmation dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("import.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("import.confirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              {t("common:cancel")}
            </Button>
            <Button variant="destructive" onClick={handleImportConfirm}>
              {t("import.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default Definitions;
