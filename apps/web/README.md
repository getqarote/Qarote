# Qarote Landing Page

The marketing website and landing page for Qarote, built with React, TypeScript, and Tailwind CSS.

## Overview

This is the public-facing website at [qarote.io](https://qarote.io) that showcases Qarote's features and drives user signups. It includes:

- **Homepage** - Product overview, features, pricing, and testimonials
- **Legal Pages** - Terms of Service and Privacy Policy
- **SEO Optimization** - Meta tags, sitemap, and structured data
- **Analytics** - Google Analytics and Google Tag Manager integration
- **Live Chat** - Tawk.to integration for customer support

## Tech Stack

- **Framework**: [React](https://react.dev/) 18 with TypeScript
- **Build Tool**: [Vite](https://vite.dev/) 7
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **SEO**: [React Helmet Async](https://github.com/staylor/react-helmet-async)
- **Analytics**: Google Analytics 4 / Google Tag Manager
- **Live Chat**: [Tawk.to](https://www.tawk.to/)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)

## Project Structure

```
apps/web/
├── public/
│   ├── images/           # Marketing images and logos
│   ├── manifest.json     # PWA manifest
│   ├── robots.txt        # Search engine directives
│   └── sitemap.xml       # XML sitemap for SEO
├── src/
│   ├── assets/           # Avatar images for testimonials
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── AuthButtons.tsx
│   │   ├── FeatureCard.tsx
│   │   ├── SEO.tsx       # SEO meta tags component
│   │   ├── StickyNav.tsx
│   │   └── TawkTo.tsx    # Live chat widget
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── gtm.ts        # Google Tag Manager
│   │   ├── logger.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Index.tsx     # Homepage
│   │   ├── NotFound.tsx  # 404 page
│   │   ├── PrivacyPolicy.tsx
│   │   └── TermsOfService.tsx
│   ├── types/            # TypeScript declarations
│   ├── App.tsx           # Main app with routing
│   ├── index.css         # Global styles
│   └── main.tsx          # Entry point
├── DEPLOYMENT.md         # Cloudflare Pages deployment guide
├── cloudflare.json       # Cloudflare configuration
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+

### Development Setup

1. **Install dependencies** (from project root):

   ```bash
   pnpm install
   ```

2. **Start the development server**:

   ```bash
   pnpm run dev:web
   ```

   The site will be available at `http://localhost:5173`.

## Available Scripts

```bash
pnpm run dev              # Start development server
pnpm run build            # Build for production
pnpm run build:cloudflare # Build for Cloudflare Pages
pnpm run preview          # Preview production build
pnpm run lint             # Check linting
pnpm run lint:fix         # Fix linting issues
pnpm run type-check       # TypeScript type checking
```

## Pages & Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Index` | Homepage with features, pricing, FAQ |
| `/privacy-policy` | `PrivacyPolicy` | Privacy policy |
| `/terms-of-service` | `TermsOfService` | Terms of service |
| `*` | `NotFound` | 404 error page |

## Deployment

This site is deployed to **Cloudflare Pages**. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy

1. Connect repository to Cloudflare Pages
2. Set build configuration:
   - **Build command**: `pnpm run build:cloudflare`
   - **Build output directory**: `dist`
   - **Root directory**: `apps/web`
3. Set environment variable: `NODE_VERSION=24`
4. Deploy

### Custom Domain

The site is configured for `qarote.io` and `www.qarote.io`.

## SEO Configuration

### Meta Tags

The `SEO` component handles meta tags for each page:

```tsx
<SEO
  title="Page Title"
  description="Page description for search engines"
  image="/images/social_card.png"
/>
```

### Sitemap

Update `public/sitemap.xml` when adding new pages.

### Robots.txt

The `public/robots.txt` file controls search engine crawling.

## Analytics

### Google Tag Manager

GTM is initialized in `src/lib/gtm.ts`. Page views are automatically tracked.

### Google Analytics

GA4 events can be sent using:

```typescript
window.gtag("event", "event_name", {
  // event parameters
});
```

## Live Chat

The Tawk.to widget is configured in `src/components/TawkTo.tsx`. It appears on all pages to provide live customer support.

## Related Documentation

- [Cloudflare Deployment](./DEPLOYMENT.md)
- [Contributing Guide](../../CONTRIBUTING.md)
