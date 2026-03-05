# Component Inventory - Customer Portal

**Part:** apps/portal/  
**Generated:** 2026-01-30  
**Framework:** React 18 with TypeScript

## Overview

The customer portal is a **license management application** with 6 pages and focused UI components for authentication, license management, and account settings.

## Pages

Located in `src/pages/`:

### Public Pages
- `Login.tsx` - Customer sign in
- `SignUp.tsx` - Customer registration

### Protected Pages
- `LicenseManagement.tsx` - View and download licenses
- `LicensePurchase.tsx` - Purchase new licenses
- `Downloads.tsx` - Download Enterprise Edition software
- `AccountSettings.tsx` - Account and billing settings

## Custom Components

### Authentication Components
Located in `src/components/auth/`:

- `GoogleLoginButton.tsx` - Google OAuth button with two modes:
  - `mode="signin"` - Sign in with Google
  - `mode="signup"` - Sign up with Google

### Layout Components
- `Layout.tsx` - Main layout with navigation and auth state

### Form Components (custom)
Located in `src/components/ui/`:
- `password-input.tsx` - Password input with visibility toggle
- `password-requirements.tsx` - Password strength indicator

## shadcn/ui Components

Located in `src/components/ui/` - **Minimal set for portal needs**:

- `button.tsx` - Button variants
- `input.tsx` - Text input
- `label.tsx` - Form labels
- `checkbox.tsx` - Checkbox with gradient checked state
- `card.tsx` - Content cards
- `form.tsx` - React Hook Form integration
- `alert.tsx` - Alert messages
- `toaster.tsx` - Toast notifications (Sonner)

## State Management

### React Context
- `AuthContext` - Authentication state (login, user, token)

### TanStack Query
- Custom hooks in `src/hooks/ui/useAuth.ts`:
  - `useLogin()` - Login mutation
  - `useRegister()` - Registration mutation

## Forms & Validation

### React Hook Form
All forms use React Hook Form with Zod validation:

**Schemas** (`src/schemas/auth.ts`):
- `signUpSchema` - Registration form validation
  - Password requirements (8+ chars, uppercase, lowercase, number, special char)
  - Password confirmation matching
  - Terms acceptance required
- `signInSchema` - Login form validation

**Form Components:**
- Sign up form with password strength indicator
- Login form with error handling
- Google OAuth integration

## Design System

### Tailwind Configuration
Custom gradients in `tailwind.config.ts`:
- `gradient-button` - Primary action gradient (orange-red)
- `gradient-auth` - Authentication page background gradient
- `card-unified` - Consistent card background color

### Checkbox Styling
- Checked state uses `data-[state=checked]:bg-gradient-button`
- Matches primary button gradient for consistency

## Authentication Flow

1. **Sign Up** → `SignUp.tsx` → `useRegister()` → Email verification required
2. **Sign In** → `Login.tsx` → `useLogin()` → Store token in `AuthContext`
3. **Google OAuth** → `GoogleLoginButton` → OAuth flow → Auto-login
4. **Protected Routes** → Check `AuthContext.isAuthenticated` → Redirect to `/auth/sign-in`

## API Integration

- **tRPC Client** - Type-safe API calls
- **React Query** - Server state management
- **Endpoints Used:**
  - `trpc.auth.session.login`
  - `trpc.auth.registration.register`
  - `trpc.license.*` (license management)
  - `trpc.payment.*` (payment processing)
