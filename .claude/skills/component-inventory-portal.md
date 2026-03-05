# Component Inventory - Customer Portal

**Part:** apps/portal/
**Generated:** 2026-03-05
**Framework:** React 18 with TypeScript

## Overview

The customer portal is a **license management application** with 8 pages and focused UI components for authentication, license management, documentation, and legal pages.

## Pages

Located in `src/pages/`:

### Public Pages
- `Login.tsx` - Customer sign in
- `SignUp.tsx` - Customer registration
- `VerifyEmail.tsx` - Email verification handler
- `PrivacyPolicy.tsx` - Privacy policy
- `TermsOfService.tsx` - Terms of service

### Protected Pages
- `LicenseManagement.tsx` - View and download licenses
- `LicensePurchase.tsx` - Purchase new licenses
- `Documentation.tsx` - Installation guides, Docker Compose setup, and environment configuration with search, table of contents, and deployment method selector

## Custom Components

### Authentication Components
Located in `src/components/auth/`:

- `GoogleLoginButton.tsx` - Google OAuth button with two modes:
  - `mode="signin"` - Sign in with Google
  - `mode="signup"` - Sign up with Google

### Layout Components
- `Layout.tsx` - Main layout with navigation, user dropdown menu, and auth state
- `LanguageSwitcher.tsx` - Language/locale switcher

### Documentation Components
Located in `src/components/documentation/`:

- `InstallationGuideSection.tsx` - Installation guide with deployment method tabs (binary, Docker Compose, Dokku)
- `DockerComposeSection.tsx` - Docker Compose configuration section
- `EnvironmentConfigSection.tsx` - Environment variable configuration section

### Form Components (custom)
Located in `src/components/ui/`:
- `password-input.tsx` - Password input with visibility toggle
- `password-requirements.tsx` - Password strength indicator

## shadcn/ui Components

Located in `src/components/ui/` - **19 files** including custom additions:

- `button.tsx` - Button variants
- `input.tsx` - Text input
- `label.tsx` - Form labels
- `select.tsx` - Dropdown select
- `checkbox.tsx` - Checkbox with gradient checked state
- `card.tsx` - Content cards
- `form.tsx` - React Hook Form integration
- `alert.tsx` - Alert messages
- `accordion.tsx` - Accordion sections
- `tabs.tsx` - Tab navigation
- `dropdown-menu.tsx` - Dropdown menus
- `heading.tsx` - Heading typography component
- `sonner.tsx` - Sonner toast configuration
- `toaster.tsx` - Toast container
- `code-block.tsx` - Code block with syntax display (custom)
- `back-to-top.tsx` - Back to top scroll button (custom)
- `table-of-contents.tsx` - Table of contents navigation (custom)

## State Management

### React Context
- `AuthContext` (`src/contexts/AuthContext.tsx`) - Authentication state (login, logout, user, token, refetchUser)

### TanStack Query
- Custom hooks in `src/hooks/ui/useAuth.ts`:
  - `useLogin()` - Login mutation
  - `useRegister()` - Registration mutation

## Forms & Validation

### React Hook Form
All forms use React Hook Form with Zod validation:

**Schemas** (`src/schemas/auth.ts`):
- `signUpSchema` - Registration form validation
  - First name and last name required
  - Email validation
  - Password requirements (8+ chars, uppercase, lowercase, number, special char)
  - Password confirmation matching
  - Terms acceptance required
- `signInSchema` - Login form validation
  - Email and password required

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

1. **Sign Up** -> `SignUp.tsx` -> `useRegister()` -> Email verification required
2. **Verify Email** -> `VerifyEmail.tsx` -> Token-based verification
3. **Sign In** -> `Login.tsx` -> `useLogin()` -> Store token in `AuthContext`
4. **Google OAuth** -> `GoogleLoginButton` -> OAuth flow -> Auto-login
5. **Protected Routes** -> `ProtectedRoute` (inline in `App.tsx`) -> Check `AuthContext.isAuthenticated` -> Redirect to `/auth/sign-in`

## API Integration

- **tRPC Client** (`src/lib/trpc/`) - Type-safe API calls with unauthorized link handling
- **React Query** (`src/lib/queryClient.ts`) - Server state management
- **Endpoints Used:**
  - `trpc.auth.session.login`
  - `trpc.auth.registration.register`
  - `trpc.license.*` (license management)
  - `trpc.payment.*` (payment processing)

## Supporting Files

- `src/constants/documentation.constants.ts` - Table of contents items and documentation constants
- `src/lib/logger.ts` - Logging utility
- `src/lib/types.ts` - Shared TypeScript types
- `src/lib/utils.ts` - Utility functions
- `src/i18n.ts` - i18next internationalization setup
