# RabbitHQ Development Guide

## Commands

- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build`
- **Build for development**: `npm run build:dev`
- **Run linting**: `npm run lint`
- **Preview build**: `npm run preview`

## Code Style Guidelines

- **Imports**: Use absolute imports with `@/` prefix (e.g., `import { Button } from "@/components/ui/button"`)
- **Components**: Use functional components with explicit TypeScript types
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Types**: Prefer explicit typing over `any`, use interfaces for complex objects
- **Formatting**: Use consistent indentation (2 spaces), trailing commas
- **Error Handling**: Use try/catch blocks with appropriate user feedback via toast messages
- **State Management**: Use React hooks (useState, useEffect) for component state
- **UI Components**: Leverage shadcn/ui components from the components/ui directory
- **API Calls**: Handle loading states and error cases, provide user feedback

## Project Structure

- `/components`: Reusable UI components
- `/pages`: Page-level components
- `/hooks`: Custom React hooks
- `/config`: Configuration files
- `/lib`: Utility functions
