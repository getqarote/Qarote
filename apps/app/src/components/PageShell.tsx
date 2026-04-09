import { ReactNode } from "react";

import { AlertCircle, Server } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Standard wrapper used by every authenticated page (happy path and
 * guard states alike). Owns the sidebar + scroll container + content
 * width constraint so individual pages don't re-derive the same 5-deep
 * JSX tree for each render branch (non-admin / no server / loading /
 * error / happy path).
 *
 * If a page needs a different content width (e.g. a narrow form page),
 * it can pass its own wrapper as children and skip `content-container-
 * large`, but default is the standard dashboard width used across list
 * and detail pages.
 */
export function PageShell({
  children,
  bare = false,
}: {
  children: ReactNode;
  /**
   * When true, skip the inner `content-container-large` wrapper. Use this
   * when rendering children that own their own content container (e.g.
   * `NoServerConfigured`) to avoid double-wrapping and broken spacing.
   */
  bare?: boolean;
}) {
  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          {bare ? (
            children
          ) : (
            <div className="content-container-large">{children}</div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}

/**
 * Full-page informational alert used inside `PageShell` for guard
 * states (access denied, no server selected, resource not found).
 * Includes the SidebarTrigger so the operator can still open the sidebar
 * from any guard state — critical on mobile where the sidebar is the
 * only navigation affordance.
 */
export function FullPageAlert({ message }: { message: string }) {
  return (
    <>
      <div className="flex items-center gap-4">
        <SidebarTrigger />
      </div>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </>
  );
}

/**
 * Renders a page title + "select a server" card. Used by list pages
 * (Users, VHosts, Queues, Exchanges, Connections) when servers are
 * configured but the operator has not picked one yet. Distinct from
 * `NoServerConfigured`, which handles the "zero servers exist" state.
 *
 * Copy is passed in because the translation keys for "noServerSelected"
 * and "selectServerPrompt" currently live in per-page i18n namespaces
 * (users, vhosts, queues…) rather than `common`, and we don't want to
 * touch those files in a design pass. Callers use their own `t()` scope.
 */
export function NoServerSelectedCard({
  title,
  subtitle,
  heading,
  description,
}: {
  title: string;
  subtitle: string;
  heading: string;
  description: string;
}) {
  return (
    <>
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="title-page">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {heading}
            </h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
