# AddServerForm Component Structure

This directory contains the modularized AddServerForm component, broken down into smaller, reusable pieces for better maintainability and testability.

## Files Structure

### Core Component

- **`AddServerForm.tsx`** - Main component that orchestrates all the sub-components
- **`index.ts`** - Barrel export file for clean imports

### Sub-Components

- **`ServerDetails.tsx`** - Handles server name, host, port, and vhost inputs
- **`Credentials.tsx`** - Manages username and password fields with show/hide password functionality
- **`SSLConfiguration.tsx`** - SSL/TLS configuration section with certificate paths
- **`ConnectionStatusDisplay.tsx`** - Displays connection test results and status messages
- **`TestConnectionButton.tsx`** - Test connection button component

### Utilities

- **`useAddServerForm.ts`** - Custom hook containing all form logic, validation, and state management
- **`types.ts`** - TypeScript interfaces and types used across the component

## Benefits of This Structure

1. **Modularity**: Each component has a single responsibility
2. **Reusability**: Sub-components can be reused in other contexts
3. **Testability**: Easier to unit test individual pieces
4. **Maintainability**: Changes to specific functionality are isolated
5. **Readability**: Smaller files are easier to understand and navigate

## Usage

```tsx
import { AddServerForm } from "@/components/AddServerForm";

// The component maintains the same API as before
<AddServerForm
  onServerAdded={() => console.log("Server added!")}
  trigger={<CustomTriggerButton />}
/>;
```

## Features Preserved

- ✅ SSL/TLS configuration with certificate paths
- ✅ Password show/hide toggle
- ✅ Form validation with error display
- ✅ Connection testing
- ✅ Scrollable modal when SSL section is expanded
- ✅ All existing functionality and styling
