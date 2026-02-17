# Qarote Portal (License Management)

React + Vite + Tailwind CSS customer/license management portal.

## React Imports

Always use **named imports** for React hooks. Never access hooks via namespace (`React.useState`).

```typescript
// WRONG — can fail in production builds
React.useState();

// CORRECT
import { useState, useEffect } from "react";
```

## Tailwind Config

Always reference `apps/portal/tailwind.config.ts` before creating or updating components. Check available custom colors, gradients, and animations.
