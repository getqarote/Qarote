# Architecture - Customer Portal

**Part:** apps/portal/  
**Generated:** 2026-01-30  
**Type:** React Single Page Application

## Executive Summary

The Qarote customer portal is a **license management application** for Enterprise Edition customers. It provides authentication, license purchase, license downloads, and account management.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | React | 18.3 | UI library |
| Language | TypeScript | 5.9 | Type-safe development |
| Build Tool | Vite | 7.2 | Fast dev server and bundler |
| API Client | tRPC Client | 11.0 | Type-safe API calls |
| State Management | TanStack Query | 5.56 | Server state |
| Routing | React Router | 6.30 | Client-side routing |
| Forms | React Hook Form | 7.66 | Form state |
| Validation | Zod | 3.25 | Schema validation |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| UI Components | shadcn/ui | Latest | Minimal component set |
| Icons | Lucide React | 0.462 | Icon library |
| OAuth | React OAuth Google | 0.12 | Google authentication |
| Date Utils | date-fns | 3.6 | Date formatting |

## Architecture Pattern

**Authentication-Focused SPA** with minimal state:

```
┌─────────────────────────────────────┐
│        AuthContext                  │
│  Login state, user data, token      │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       React Router                  │
│  Public routes + Protected routes   │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      Page Components                │
│  Login, Licenses, Purchase, etc.    │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│    Feature Components               │
│  Forms, License cards, etc.         │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      UI Components (minimal)        │
│  Button, Input, Card, Form, etc.    │
└─────────────────────────────────────┘
```

## Directory Structure

```
apps/portal/src/
├── components/
│   ├── auth/            # Authentication components
│   │   └── GoogleLoginButton.tsx
│   ├── ui/              # shadcn/ui components (minimal set)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── password-input.tsx
│   │   ├── password-requirements.tsx
│   │   ├── checkbox.tsx
│   │   ├── label.tsx
│   │   ├── form.tsx
│   │   ├── card.tsx
│   │   ├── alert.tsx
│   │   └── toaster.tsx
│   └── Layout.tsx       # Main layout with navigation
├── contexts/
│   └── AuthContext.tsx  # Authentication state
├── hooks/
│   └── ui/
│       └── useAuth.ts   # Login/register mutations
├── lib/
│   ├── trpc/            # tRPC client setup
│   │   ├── client.ts
│   │   └── provider.tsx
│   ├── queryClient.ts   # React Query config
│   ├── logger.ts        # Console logging
│   └── utils.ts         # Helper functions
├── pages/               # 6 pages total
│   ├── Login.tsx        # Sign in
│   ├── SignUp.tsx       # Registration
│   ├── LicenseManagement.tsx
│   ├── LicensePurchase.tsx
│   ├── Downloads.tsx
│   └── AccountSettings.tsx
├── schemas/             # Zod schemas
│   ├── auth.ts          # Sign up/sign in validation
│   └── index.ts
├── styles/
│   └── google-auth.css  # Google button styling
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

## State Management

### AuthContext
Single context for authentication:
- `user` - Current user
- `token` - JWT token
- `isAuthenticated` - Auth status
- `isLoading` - Loading state
- `login()` - Store auth data
- `logout()` - Clear auth data

**Storage:** localStorage (`auth_token`, `auth_user`)

### TanStack Query
Minimal usage for API calls:
- `useLogin()` - Login mutation
- `useRegister()` - Registration mutation
- License queries (to be added)

## Routing

**Public Routes:**
- `/auth/sign-in` - Login page (also `/login` for backward compatibility)
- `/auth/sign-up` - Registration page

**Protected Routes:**
- `/` - Redirects to `/licenses`
- `/licenses` - License management (list, download)
- `/purchase` - Purchase new licenses
- `/downloads` - Download Enterprise Edition
- `/settings` - Account and billing settings

**Route Protection:**
`ProtectedRoute` component checks authentication and redirects to `/auth/sign-in` if not logged in.

## Authentication Flow

### Email/Password Registration
1. User fills sign-up form (`SignUp.tsx`)
2. Form validates with `signUpSchema` (Zod):
   - Name, email, password requirements
   - Password confirmation
   - Terms acceptance
3. `useRegister()` mutation → `trpc.auth.registration.register`
4. Success → Show "Check email" message
5. User verifies email (separate flow in main app)
6. User returns to login

### Email/Password Login
1. User fills login form (`Login.tsx`)
2. Form validates with `signInSchema`
3. `useLogin()` mutation → `trpc.auth.session.login`
4. Success → Store token in `AuthContext` → Redirect to `/licenses`

### Google OAuth
1. User clicks "Sign in with Google" (`GoogleLoginButton`)
2. Google OAuth flow (popup)
3. Frontend gets OAuth token
4. `trpc.auth.google.authenticate` with token
5. Success → Store token → Redirect

## Form System

**React Hook Form + Zod:**

All forms use:
- `useForm` with `zodResolver`
- Field-level validation
- Error message display
- Submit handling

**Custom Form Components:**
- `password-input.tsx` - Password field with show/hide toggle
- `password-requirements.tsx` - Real-time password strength indicator

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Styling System

**Tailwind CSS** with custom portal theme:

**Custom Gradients:**
- `gradient-button` - Primary action gradient
- `gradient-auth` - Authentication page background (135deg, orange-red)

**Checkbox Styling:**
- Checked state uses gradient: `data-[state=checked]:bg-gradient-button`
- Matches button styling for consistency

**Card Styling:**
- `card-unified` - Consistent warm background color (`rgb(252 250 246)`)

## Component Design

**Minimal, Focused Component Set:**

Portal only includes UI components needed for its specific features:
- Form components (input, button, checkbox, label)
- Layout components (card)
- Feedback components (alert, toast)
- No data visualization or complex UI (not needed)

**Google OAuth Button:**
- Supports two modes: `signin` and `signup`
- Changes button text accordingly
- Integrated with `@react-oauth/google`

## API Integration

**tRPC Client:**

Endpoints used:
- `trpc.auth.session.login` - Login
- `trpc.auth.registration.register` - Registration
- `trpc.auth.google.authenticate` - OAuth
- `trpc.license.*` - License operations (to be implemented)
- `trpc.payment.*` - License purchases (to be implemented)

**Type Safety:**
Imports `AppRouter` type from API for full type inference.

## Build Configuration

**Vite Optimizations:**

**Manual Chunks:**
- `vendor-react` - React, React DOM, React Router
- `vendor-ui` - Radix UI components
- `vendor-data` - TanStack Query
- `vendor-icons` - Lucide icons
- `vendor-forms` - React Hook Form, Zod, resolvers
- `vendor-utils` - Utilities

**Critical Configuration:**
- `dedupe: ['react', 'react-dom']` - Prevents duplicate React instances
- Ensures single React instance across dependencies
- Prevents production errors like "Cannot read properties of null (reading 'useEffect')"

## Deployment

**Platform:** Cloudflare Pages

**Configuration:**
- Build command: `pnpm run build:cloudflare`
- Output directory: `dist/`
- Root directory: `apps/portal`
- Environment: `NODE_VERSION=24`, `VITE_API_URL`

**Custom Domain:** `portal.qarote.io`

## Security

**Authentication:**
- JWT tokens from API
- Stored in localStorage
- Sent in Authorization header

**Form Security:**
- Client-side validation (Zod)
- Server-side validation (API)
- HTTPS only in production

## Future Features

Based on page structure, planned features include:
- License list and details view
- License file download
- License purchase flow (Stripe integration)
- Account settings management
- Billing history

## Performance

**Optimizations:**
- Minimal bundle size (focused feature set)
- Code splitting by route
- No heavy dependencies (charts, complex UI)
- Fast initial load for authentication

**Metrics:**
Target similar performance to landing page:
- Fast authentication flow
- Minimal JavaScript payload
- CDN-served assets
