import * as React from "react";

import "@radix-ui/react-accordion";

declare module "@radix-ui/react-accordion" {
  namespace AccordionPrimitive {
    interface RootProps {
      children?: React.ReactNode;
      className?: string;
    }
  }
}
