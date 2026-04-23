# Component Inventory - Landing Page

**Part:** apps/web/  
**Generated:** 2026-01-30  
**Framework:** React 18 with TypeScript

## Overview

The landing page is a **marketing-focused React SPA** with 4 pages and ~50 shadcn/ui components. It uses lazy loading for performance optimization.

## Pages

Located in `src/pages/`:

- `Index.tsx` - Homepage (eager loaded)
  - Hero section with CTA
  - Feature showcase
  - Pricing comparison
  - FAQ section
  - Testimonials
- `PrivacyPolicy.tsx` - Privacy policy (lazy loaded)
- `TermsOfService.tsx` - Terms of service (lazy loaded)
- `NotFound.tsx` - 404 error page (lazy loaded)

## Marketing Components

Located in `src/components/`:

### Custom Components
- `SEO.tsx` - SEO meta tags component (React Helmet)
- `AuthButtons.tsx` - Sign up / Sign in buttons with variants
- `FeatureCard.tsx` - Feature showcase cards
- `StickyNav.tsx` - Sticky navigation header
- `TawkTo.tsx` - Live chat widget (deferred loading)
- `FAQ.tsx` - FAQ accordion section

### Component Variants
`AuthButtons` supports two variants:
- `light` - White background for colored sections
- `dark` - Gradient background (default)

## shadcn/ui Components

Located in `src/components/ui/` - **~50 reusable UI components**:

Full shadcn/ui library including:
- Form components (button, input, select, checkbox, etc.)
- Display components (card, badge, avatar, table, etc.)
- Overlay components (dialog, popover, dropdown, tooltip, etc.)
- Navigation (tabs, accordion, etc.)
- Feedback (toast, alert, etc.)

## Third-Party Integrations

### Tawk.to Live Chat
- Loaded **deferred** (after 3s idle) to not block LCP
- Uses `requestIdleCallback` for performance
- Lazy loaded with React `Suspense`

### Analytics
- **Google Tag Manager** - Initialized via `src/lib/gtm.ts`
- **Google Analytics 4** - Page view tracking
- GTM deferred with `load` event listener for better FCP

## Performance Optimizations

### Code Splitting
- Secondary pages lazy loaded (`React.lazy`)
- TawkTo widget deferred until idle
- GTM loaded after page load

### Image Optimization
- WebP format with responsive sizes (640w, 1280w, 1920w)
- Preload LCP image with `fetchpriority="high"`
- Dashboard screenshot optimized

### Build Optimization
- Manual chunks: vendor-react, vendor-ui, vendor-data, vendor-icons, vendor-utils
- Tree-shaking enabled
- CSS code splitting
- 4KB asset inline limit

## Styling

### Tailwind Configuration
- Custom colors with gradients
- Responsive design (mobile-first)
- Dark mode not used (marketing site)

### Gradient System
- `gradient-to-r from-orange-500 to-red-500` - Primary gradient
- Used for buttons, backgrounds, and accents
