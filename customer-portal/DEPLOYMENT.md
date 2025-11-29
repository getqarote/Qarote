# Deploying Customer Portal to Cloudflare Pages

This document explains the necessary steps to deploy the RabbitHQ Customer Portal to Cloudflare Pages.

## Prerequisites

1. A Cloudflare account
2. Access to the RabbitHQ backend API

## Environment Variables

Set these environment variables in your Cloudflare Pages project:

- `VITE_API_URL`: The URL of your RabbitHQ backend API (e.g., `https://api.rabbithq.io`)

## Build Configuration

The project includes a special build command for Cloudflare Pages which avoids issues with optional dependencies:

```json
"build:cloudflare": "npm install --no-optional && vite build"
```

## Deployment Steps

1. In Cloudflare Pages, connect your repository
2. Configure the build settings:
   - Build command: `npm run build:cloudflare`
   - Build output directory: `dist`
   - Root directory: `customer-portal` (if deploying from monorepo root)
   - Node.js version: 18 (or latest LTS)
3. Add your environment variables:
   - `VITE_API_URL`: Your backend API URL
4. Deploy

## Custom Domain

After deployment, you can configure a custom domain in Cloudflare Pages:
- Recommended: `portal.rabbithq.io` or `customers.rabbithq.io`

## Troubleshooting

If you encounter build issues:

1. Make sure the `.npmrc` file is included in your repository (if using one)
2. Verify that the `cloudflare.json` configuration is correct
3. Check that your environment variables are set correctly
4. Ensure the build output directory is set to `dist`

