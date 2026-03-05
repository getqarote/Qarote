# Component Inventory - App Dashboard

**Part:** apps/app/
**Generated:** 2026-03-05
**Framework:** React 18 with TypeScript

## Overview

The dashboard contains **151 component files** organized into UI primitives (shadcn/ui), feature components, and page components. All components are functional components using React hooks.

## Pages (Route Components)

Located in `src/pages/`:

### Public Pages
- `SignIn.tsx` - User login
- `SignUp.tsx` - User registration
- `ForgotPassword.tsx` - Password reset request
- `ResetPassword.tsx` - Password reset form with token
- `VerifyEmail.tsx` - Email verification handler
- `AcceptInvitation.tsx` - Workspace invitation acceptance
- `NotFound.tsx` - 404 error page
- `TermsOfService.tsx` (`public/`) - Legal terms
- `PrivacyPolicy.tsx` (`public/`) - Privacy policy

### Protected Pages
- `Index.tsx` - Main dashboard with server overview
- `Queues.tsx` - Queue list view
- `QueueDetail.tsx` - Individual queue details and message browser
- `Exchanges.tsx` - Exchange list
- `Connections.tsx` - Active RabbitMQ connections
- `Nodes.tsx` - Cluster node information
- `VHostsPage.tsx` - Virtual host list
- `VHostDetailsPage.tsx` - Virtual host details
- `UsersPage.tsx` - RabbitMQ user list
- `UserDetailsPage.tsx` - RabbitMQ user details
- `Alerts.tsx` - Alert dashboard (Enterprise)
- `Workspace.tsx` - Workspace settings (Enterprise)
- `Profile.tsx` - User profile and settings
- `Plans.tsx` - Subscription plans
- `Billing.tsx` - Billing and payment history
- `License.tsx` - License management (self-hosted)
- `HelpSupport.tsx` - Help and support
- `PaymentSuccess.tsx` - Payment success callback
- `PaymentCancelled.tsx` - Payment cancellation page
- `SMTPSettings.tsx` - SMTP configuration (self-hosted)
- `SSOSettings.tsx` - SSO configuration
- `SSOCallback.tsx` - SSO authentication callback

---

## Layout Components

### Core Layout
- `Layout.tsx` - Main application layout with sidebar and header
- `ProtectedRoute.tsx` - Route wrapper requiring authentication
- `PublicRoute.tsx` - Route wrapper for unauthenticated pages

---

## Feature Components

Located in `src/components/`:

### Dashboard Components (top-level)
- `PrimaryMetricsCards.tsx` - Primary server health summary cards
- `SecondaryMetricsCards.tsx` - Secondary metric display cards
- `MessagesRatesChart.tsx` - Real-time message rate visualization
- `QueuedMessagesChart.tsx` - Queued messages chart
- `QueueDepthsChart.tsx` - Queue depths chart
- `ResourceUsage.tsx` - Resource usage display
- `RecentAlerts.tsx` - Recent alerts summary on dashboard
- `ConnectedNodes.tsx` - Connected nodes display
- `TimeRangeSelector.tsx` - Time range filter selector

### Server Management (top-level)
- `AddServerButton.tsx` - Button to add a new server
- `ServerManagement.tsx` - Server management controls
- `ConnectionStatus.tsx` - Server connection status indicator
- `NoServerConfigured.tsx` - Empty state when no servers exist

### Add Server Form (`AddServerFormComponent/`)
- `AddServerForm.tsx` - Main add server form
- `ConnectionStatusDisplay.tsx` - Connection status indicator within form
- `Credentials.tsx` - Server credential inputs
- `RabbitMqVersionInfo.tsx` - RabbitMQ version display
- `ServerDetails.tsx` - Server detail fields
- `ServerUrlInput.tsx` - Server URL input with validation
- `TestConnectionButton.tsx` - Test connection action
- `TunnelHelper.tsx` - Tunnel configuration helper
- `index.ts` - Barrel export
- `types.ts` - Shared types

### Queue Management
- `AddQueueButton.tsx` - Button to add a queue
- `AddQueueForm.tsx` - Queue creation form
- `PauseQueueDialog.tsx` - Pause queue confirmation dialog
- `PurgeQueueDialog.tsx` - Purge queue confirmation dialog

### Queue List (`Queues/`)
- `QueueHeader.tsx` - Queue list page header
- `QueueTable.tsx` - Queue data table

### Queue Detail (`QueueDetail/`)
- `QueueHeader.tsx` - Queue detail page header
- `QueueStats.tsx` - Queue statistics display
- `QueueTiming.tsx` - Queue timing metrics
- `QueueConfiguration.tsx` - Queue configuration details
- `QueueBindings.tsx` - Queue bindings table
- `ConsumerDetails.tsx` - Consumer details table
- `MessageStatistics.tsx` - Message statistics display
- `LoadingSkeleton.tsx` - Loading skeleton for queue detail
- `NotFound.tsx` - Queue not found state

### Exchange Management (top-level)
- `AddExchangeButton.tsx` - Button to add an exchange
- `ExchangeManagement.tsx` - Exchange list and management

### Message Management (top-level)
- `AddSendMessageButton.tsx` - Button to open send message dialog
- `SendMessageDialog.tsx` - Message publishing dialog

### Alert Components (`alerts/`)
- `ActiveAlertsList.tsx` - Table of active alerts
- `ResolvedAlertsList.tsx` - Table of resolved alerts
- `AlertItem.tsx` - Individual alert display
- `AlertsSummary.tsx` - Alert summary statistics
- `AlertRulesModal.tsx` - Create/edit alert rules modal
- `AlertNotificationSettingsModal.tsx` - Alert notification settings modal
- `alertUtils.tsx` - Alert utility functions

### Billing Components (`billing/`)
- `BillingHeader.tsx` - Billing page header
- `BillingLayout.tsx` - Billing page layout wrapper
- `CurrentPlanCard.tsx` - Current plan information card
- `SubscriptionManagement.tsx` - Subscription management controls
- `CancelSubscriptionModal.tsx` - Cancel subscription confirmation modal
- `RecentPayments.tsx` - Payment transaction table
- `index.ts` - Barrel export

### Plans Components (`plans/`)
- `PlanUpgradeModal.tsx` - Plan upgrade/selection modal

### Profile Components (`profile/`)
- `PersonalInfoTab.tsx` - Personal information tab
- `CompactEmailChangeForm.tsx` - Email change form
- `CompactPasswordChangeForm.tsx` - Password change form
- `EnhancedTeamTab.tsx` - Team management tab
- `InviteUserDialogEnhanced.tsx` - Invite user dialog
- `WorkspaceInfoTab.tsx` - Workspace information tab
- `WorkspaceFormFields.tsx` - Workspace form input fields
- `PlansSummaryTab.tsx` - Plans summary tab
- `NoWorkspaceCard.tsx` - No workspace empty state
- `ProfileLoading.tsx` - Profile page loading skeleton
- `profileUtils.ts` - Profile utility functions
- `index.ts` - Barrel export

### Node Components (`nodes/`)
- `EnhancedNodesOverview.tsx` - Cluster nodes overview cards
- `EnhancedNodesTable.tsx` - Detailed nodes data table

### Virtual Host Components (`vhosts/`)
- `CreateVHostModal.tsx` - Create virtual host modal
- `DeleteVHostModal.tsx` - Delete virtual host confirmation modal
- `EditVHostModal.tsx` - Edit virtual host modal

### User Components (`users/`)
- `AddUserButton.tsx` - Add RabbitMQ user button with form
- `DeleteUserModal.tsx` - Delete user confirmation modal

### Auth Components (`auth/`)
- `GoogleLoginButton.tsx` - Google OAuth login button
- `GoogleInvitationButton.tsx` - Google OAuth invitation acceptance button
- `SSOLoginButton.tsx` - SSO login button

### Shared / Utility Components (top-level)
- `AppHeader.tsx` - Application header bar
- `AppSidebar.tsx` - Application sidebar navigation
- `WorkspaceSelector.tsx` - Workspace dropdown selector
- `FeatureGate.tsx` - Premium feature gate wrapper
- `UpgradePrompt.tsx` - Upgrade prompt for gated features
- `LanguageSwitcher.tsx` - Language/locale switcher
- `ThemeToggle.tsx` - Dark/light theme toggle
- `AddVirtualHostButton.tsx` - Add virtual host button
- `CreateWorkspaceForm.tsx` - Create workspace form
- `DiscordLink.tsx` - Discord community link
- `EnhancedErrorDisplay.tsx` - Enhanced error display component
- `RabbitMQPermissionError.tsx` - RabbitMQ permission error display
- `FeedbackForm.tsx` - User feedback submission form
- `PageLoader.tsx` - Full-page loading spinner
- `ScrollToTop.tsx` - Scroll to top on navigation
- `TawkTo.tsx` - Tawk.to live chat integration

---

## shadcn/ui Components

Located in `src/components/ui/` - **53 files** including custom additions:

### Form Components
- `button.tsx` - Button variants
- `input.tsx` - Text input
- `inputOtp.tsx` - OTP input
- `select.tsx` - Dropdown select
- `checkbox.tsx` - Checkbox input
- `switch.tsx` - Toggle switch
- `radioGroup.tsx` - Radio button group
- `textarea.tsx` - Multi-line text input
- `label.tsx` - Form label
- `form.tsx` - React Hook Form integration
- `password-input.tsx` - Password input with visibility toggle (custom)
- `password-requirements.tsx` - Password strength indicator (custom)
- `tags-input.tsx` - Tags input with add/remove (custom)

### Display Components
- `card.tsx` - Content cards
- `badge.tsx` - Status badges
- `avatar.tsx` - User avatars
- `separator.tsx` - Horizontal divider
- `skeleton.tsx` - Loading skeletons
- `progress.tsx` - Progress bar
- `table.tsx` - Data tables
- `aspectRatio.tsx` - Aspect ratio container
- `PageHeader.tsx` - Page header with title and description (custom)
- `PlanBadge.tsx` - Plan tier badge (custom)

### Overlay Components
- `dialog.tsx` - Modal dialogs
- `alertDialog.tsx` - Confirmation dialogs
- `popover.tsx` - Popover menus
- `dropdownMenu.tsx` - Dropdown menus
- `contextMenu.tsx` - Right-click menus
- `sheet.tsx` - Side sheets
- `drawer.tsx` - Bottom drawer
- `hoverCard.tsx` - Hover previews
- `tooltip.tsx` - Tooltips

### Navigation Components
- `tabs.tsx` - Tab navigation
- `navigationMenu.tsx` - Navigation menus
- `menubar.tsx` - Menu bar
- `command.tsx` - Command palette
- `pagination.tsx` - Page navigation
- `breadcrumb.tsx` - Breadcrumb navigation
- `sidebar.tsx` - Sidebar navigation component

### Feedback Components
- `toast.tsx` - Toast notification primitives
- `toaster.tsx` - Toast container
- `sonner.tsx` - Sonner toast notifications
- `alert.tsx` - Alert messages

### Data Visualization
- `chart.tsx` - Chart components (Recharts integration)
- `calendar.tsx` - Calendar component

### Utility Components
- `scrollArea.tsx` - Scrollable containers
- `resizable.tsx` - Resizable panels
- `collapsible.tsx` - Collapsible sections
- `accordion.tsx` - Accordion menus
- `carousel.tsx` - Image carousels
- `slider.tsx` - Range sliders
- `toggle.tsx` - Toggle buttons
- `toggleGroup.tsx` - Toggle button groups

---

## Component Patterns

### Composition Pattern
Components use `React.forwardRef` and `@radix-ui` primitives for composability:

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    ...
  </DialogContent>
</Dialog>
```

### Data Fetching Pattern
Components use custom hooks for data:

```tsx
const { data: queues, isLoading } = useQueues(serverId);
```

### Form Pattern
Forms use React Hook Form with Zod validation:

```tsx
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});
```

## Design System

### Tailwind Configuration
Custom theme in `tailwind.config.ts`:
- Colors: `primary`, `secondary`, `destructive`, `muted`, `accent`
- Gradients: `gradient-page`, `gradient-button`, `gradient-title`
- Dark mode support

### Component Styling
- All styling via Tailwind CSS classes
- No inline styles
- Custom component classes in `index.css`
- Gradient buttons for primary CTAs

## Feature Gates

Enterprise features wrapped in `FeatureGate` component:

```tsx
<FeatureGate feature="alerting">
  <Alerts />
</FeatureGate>
```

Features:
- `workspace_management`
- `alerting`
- `slack_integration`
- `webhook_integration`
- `data_export`
- `advanced_alert_rules`
