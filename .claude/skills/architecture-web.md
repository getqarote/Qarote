# Architecture - Landing Page

**Part:** apps/web/  
**Generated:** 2026-01-30  
**Type:** React Single Page Application (Marketing)

## Executive Summary

The Qarote landing page is a **performance-optimized marketing website** built with React and Vite, designed to showcase features, drive signups, and rank well in search engines.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | React | 18.3 | UI library |
| Language | TypeScript | 5.9 | Type-safe development |
| Build Tool | Vite | 7.2 | Fast bundler and dev server |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| UI Components | shadcn/ui | Latest | Component library |
| SEO | React Helmet Async | 2.0 | Meta tag management |
| Analytics | Google Tag Manager | - | Analytics and tracking |
| Live Chat | Tawk.to | 2.0 | Customer support widget |
| Routing | React Router | 6.30 | Client-side routing |
| Icons | Lucide React | 0.462 | Icon library |
| State | TanStack Query | 5.56 | Minimal server state |

## Architecture Pattern

**Static Marketing Site** with performance-first design:

```
┌─────────────────────────────────────┐
│       React Router                  │
│  4 Routes (/, /privacy, /terms, 404)│
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      Page Components                │
│  Index (eager), others (lazy)       │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│    Marketing Components             │
│  SEO, AuthButtons, FAQ, Features    │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      UI Components (shadcn)         │
│  Button, Card, Accordion, etc.      │
└─────────────────────────────────────┘
```

## Directory Structure

```
apps/web/src/
├── components/
│   ├── ui/              # shadcn/ui library (~50 components)
│   ├── SEO.tsx          # Meta tags component
│   ├── AuthButtons.tsx  # Sign up/Sign in CTAs
│   ├── FeatureCard.tsx  # Feature showcase cards
│   ├── FAQ.tsx          # FAQ accordion
│   ├── StickyNav.tsx    # Sticky navigation
│   └── TawkTo.tsx       # Live chat widget
├── pages/
│   ├── Index.tsx        # Homepage (eager loaded)
│   ├── NotFound.tsx     # 404 page (lazy)
│   ├── PrivacyPolicy.tsx # (lazy)
│   └── TermsOfService.tsx # (lazy)
├── lib/
│   ├── gtm.ts           # Google Tag Manager
│   ├── logger.ts        # Console logging
│   └── utils.ts         # Utilities (cn, etc.)
├── assets/              # Avatar images for testimonials
├── types/               # TypeScript declarations
├── index.css            # Global styles + Tailwind
├── App.tsx              # Root component with providers
└── main.tsx             # Entry point
```

## Key Features

### Homepage Sections
1. **Hero** - Product headline and CTAs
2. **Features** - Key feature showcase
3. **Pricing** - Plan comparison table
4. **FAQ** - Frequently asked questions
5. **Testimonials** - Customer reviews
6. **Footer** - Links and legal

### SEO Component

`SEO.tsx` provides per-page meta tags:
- Page title and description
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URLs
- Structured data (JSON-LD)

**Example:**

```tsx
<SEO 
  title="Qarote - RabbitMQ Monitoring"
  description="Modern RabbitMQ monitoring..."
  image="/images/social_card.png"
/>
```

### Auth Buttons Component

`AuthButtons.tsx` supports two visual variants:
- **light** - White background (for colored sections)
- **dark** - Gradient background (default)

Buttons link to:
- Sign Up: `https://app.qarote.io/auth/sign-up`
- Sign In: `https://app.qarote.io/auth/sign-in`

## Performance Optimizations

### Code Splitting
- **Eager Loading:** Homepage only (`Index.tsx`)
- **Lazy Loading:** Secondary pages (Privacy, Terms, 404)
- **Deferred Loading:** TawkTo widget (3s after idle)

### Image Optimization
- **WebP format** with responsive sizes (640w, 1280w, 1920w)
- **Preload** LCP image with `fetchpriority="high"`
- **Optimized** dashboard screenshots

### JavaScript Optimization
- **Manual Chunks:**
  - `vendor-react` - React + React DOM + React Router
  - `vendor-ui` - Radix UI components
  - `vendor-data` - TanStack Query
  - `vendor-icons` - Lucide icons
  - `vendor-utils` - Utilities (date-fns, clsx, etc.)
- **Tree-Shaking:** Remove unused code
- **CSS Code Splitting:** Separate CSS files

### Third-Party Script Deferral
- **GTM:** Loaded after window `load` event + 100ms delay
- **TawkTo:** Loaded after `requestIdleCallback` + 3s delay

**Result:** Faster First Contentful Paint (FCP) and Largest Contentful Paint (LCP)

## Styling System

**Tailwind CSS** with custom gradients:

**Primary Gradient:**
- Orange-to-red gradient for CTAs
- `bg-gradient-to-r from-orange-500 to-red-500`
- Hover: `from-orange-600 to-red-600`

**Component Styling:**
- All styling via Tailwind utility classes
- Custom classes in `index.css`
- No inline styles

## Routing

**Routes:**
- `/` - Homepage
- `/privacy-policy` - Privacy Policy
- `/terms-of-service` - Terms of Service
- `*` - 404 Not Found

All routes wrapped with:
- `HelmetProvider` (SEO)
- `QueryClientProvider` (React Query)
- `TooltipProvider` (Radix UI)
- `BrowserRouter` (React Router)

## Analytics Integration

### Google Tag Manager
- Container ID: `GTM-5G4639NQ`
- Initialized in `src/lib/gtm.ts`
- Page views auto-tracked
- Custom events via `window.gtag()`

### Structured Data
JSON-LD schema in `index.html`:
- Organization schema
- Product schema
- Breadcrumb schema

## Build Configuration

**Vite Optimizations:**
- Target: `esnext`
- Minify: `esbuild`
- Sourcemaps: Disabled in production
- Asset inline limit: 4KB
- Tree-shaking: Aggressive

**Build Output:**
- `dist/` directory
- Static files for CDN deployment

## Deployment

**Platform:** Cloudflare Pages

**Configuration:**
- Build command: `pnpm run build:cloudflare`
- Output directory: `dist/`
- Node version: 24

**Custom Domain:** `qarote.io`, `www.qarote.io`

**SEO Files:**
- `public/sitemap.xml` - XML sitemap
- `public/robots.txt` - Search engine directives
- `public/manifest.json` - PWA manifest

## Hosting Strategy

**Cloudflare Pages Benefits:**
- Global CDN distribution
- Automatic SSL/TLS
- Preview deployments per commit
- Serverless (no backend needed)
- DDoS protection

## Third-Party Integrations

1. **Google Tag Manager** - Analytics and tracking
2. **Tawk.to** - Live customer support chat
3. **Google OAuth** - Sign up flow (redirects to app)

## Performance Metrics Goals

- **LCP** < 2.5s (Largest Contentful Paint)
- **FCP** < 1.8s (First Contentful Paint)
- **CLS** < 0.1 (Cumulative Layout Shift)
- **TTI** < 3.8s (Time to Interactive)

Achieved through deferred scripts, image optimization, and code splitting.
