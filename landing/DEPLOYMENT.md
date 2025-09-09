# Deploying to Cloudflare Pages

This document explains the necessary steps to deploy this application to Cloudflare Pages.

## Prerequisites

1. A Cloudflare account
2. A Formspree account with a form created

## Environment Variables

Set these environment variables in your Cloudflare Pages project:

- `VITE_FORMSPREE_FORM_ID`: Your Formspree form ID

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
   - Node.js version: 18 (or latest LTS)
3. Add your environment variables
4. Deploy

## Troubleshooting

If you encounter build issues:

1. Make sure the `.npmrc` file is included in your repository
2. Verify that the `cloudflare.json` configuration is correct
3. Check that your environment variables are set correctly
