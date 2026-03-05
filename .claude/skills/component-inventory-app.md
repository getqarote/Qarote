# Component Inventory - App Dashboard

**Part:** apps/app/  
**Generated:** 2026-01-30  
**Framework:** React 18 with TypeScript

## Overview

The dashboard contains **50+ components** organized into UI components, feature components, and page components. All components are functional components using React hooks.

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
- `HelpSupport.tsx` - Help and support
- `PaymentSuccess.tsx` - Payment success callback
- `PaymentCancelled.tsx` - Payment cancellation page

---

## Layout Components

### Core Layout
- `Layout.tsx` - Main application layout with sidebar and header
- `ProtectedRoute.tsx` - Route wrapper requiring authentication

---

## Feature Components

Located in `src/components/`:

### Dashboard Components
- `DashboardOverviewCard.tsx` - Server health summary cards
- `LiveRatesChart.tsx` - Real-time message rate visualization
- `StatsCard.tsx` - Metric display cards
- `ServerSelector.tsx` - Server dropdown selector

### Queue Management
- `QueueList.tsx` - Table of queues
- `QueueActions.tsx` - Queue action buttons
- `MessageBrowser.tsx` - Browse queue messages
- `PublishMessage.tsx` - Form to publish messages
- `MessageDetails.tsx` - Message content viewer

### Alert Components (Enterprise)
- `AlertList.tsx` - Table of active alerts
- `AlertRuleForm.tsx` - Create/edit alert rules
- `AlertCard.tsx` - Individual alert display

### Workspace Components (Enterprise)
- `WorkspaceMembers.tsx` - Member management table
- `InviteMember.tsx` - Send invitation form
- `WorkspaceSettings.tsx` - Workspace configuration

### Profile Components
- `UserProfileForm.tsx` - Edit user details
- `WorkspaceInfoTab.tsx` - Workspace information
- `WorkspaceFormFields.tsx` - Workspace form inputs

### Billing Components
- `PlanCard.tsx` - Subscription plan display
- `PaymentHistory.tsx` - Payment transaction table
- `UpgradeButton.tsx` - Plan upgrade CTA
- `PlanFeaturesList.tsx` - Feature comparison

### RabbitMQ Infrastructure
- `VHostList.tsx` - Virtual host table
- `ConnectionList.tsx` - Active connection table
- `NodeList.tsx` - Cluster node table
- `ExchangeList.tsx` - Exchange table
- `UserList.tsx` - RabbitMQ user table

---

## shadcn/ui Components

Located in `src/components/ui/` - **40+ reusable UI components**:

### Form Components
- `button.tsx` - Button variants
- `input.tsx` - Text input
- `select.tsx` - Dropdown select
- `checkbox.tsx` - Checkbox input
- `switch.tsx` - Toggle switch
- `radio-group.tsx` - Radio button group
- `textarea.tsx` - Multi-line text input
- `label.tsx` - Form label
- `form.tsx` - React Hook Form integration

### Display Components
- `card.tsx` - Content cards
- `badge.tsx` - Status badges
- `avatar.tsx` - User avatars
- `separator.tsx` - Horizontal divider
- `skeleton.tsx` - Loading skeletons
- `progress.tsx` - Progress bar
- `table.tsx` - Data tables

### Overlay Components
- `dialog.tsx` - Modal dialogs
- `alert-dialog.tsx` - Confirmation dialogs
- `popover.tsx` - Popover menus
- `dropdown-menu.tsx` - Dropdown menus
- `context-menu.tsx` - Right-click menus
- `sheet.tsx` - Side sheets
- `drawer.tsx` - Bottom drawer
- `hover-card.tsx` - Hover previews
- `tooltip.tsx` - Tooltips

### Navigation Components
- `tabs.tsx` - Tab navigation
- `navigation-menu.tsx` - Navigation menus
- `command.tsx` - Command palette
- `pagination.tsx` - Page navigation
- `breadcrumb.tsx` - Breadcrumb navigation

### Feedback Components
- `toast.tsx` / `toaster.tsx` / `sonner.tsx` - Toast notifications
- `alert.tsx` - Alert messages

### Data Visualization
- `chart.tsx` - Chart components (Recharts integration)

### Utility Components
- `scroll-area.tsx` - Scrollable containers
- `resizable.tsx` - Resizable panels
- `collapsible.tsx` - Collapsible sections
- `accordion.tsx` - Accordion menus
- `carousel.tsx` - Image carousels
- `slider.tsx` - Range sliders
- `toggle.tsx` / `toggle-group.tsx` - Toggle buttons

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
