import { Toaster as Sonner } from "sonner";

import {
  IconBell,
  IconCheck,
  IconClose,
  IconSparkle,
} from "@/components/ui/icons";

import { useTheme } from "@/contexts/ThemeContext";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Per-severity icon = a 26px rounded-[7px] tinted badge (prototype `.toast__ic`).
// Each tint maps a prototype var to a repo token:
//   success → good-wash / good        info → carrot-soft / carrot
//   warning → amber-wash / amber       error → red-wash / red
//   loading → surface-2 / ink-3 (+ carrot spinner)
const BADGE = "grid size-[26px] shrink-0 place-items-center rounded-[7px]";

const toastIcons: ToasterProps["icons"] = {
  success: (
    <span className={`${BADGE} bg-success-muted text-success`}>
      <IconCheck size={15} />
    </span>
  ),
  info: (
    <span className={`${BADGE} bg-accent text-primary`}>
      <IconSparkle size={15} />
    </span>
  ),
  warning: (
    <span className={`${BADGE} bg-warning-muted text-warning`}>
      <IconBell size={15} />
    </span>
  ),
  error: (
    <span className={`${BADGE} bg-destructive/10 text-destructive`}>
      <IconClose size={15} />
    </span>
  ),
  loading: (
    <span className={`${BADGE} bg-muted text-muted-foreground`}>
      <span className="size-[15px] animate-spin rounded-full border-2 border-border border-t-primary" />
    </span>
  ),
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      position="top-right"
      // Prototype `.toasts`: top:18 / right:18, width min(370px, 100vw-36px).
      // sonner reads --width off its own style for toast width.
      offset={{ top: 18, right: 18 }}
      // Mobile ≤600px: full-width strip at the top (prototype @media 560px).
      mobileOffset={{ top: 12, left: 12, right: 12 }}
      style={
        {
          // Cast: sonner's `style` is CSSProperties; CSS custom props are valid
          // at runtime but not in the typed surface.
          zIndex: 200,
          "--width": "min(370px, calc(100vw - 36px))",
        } as React.CSSProperties
      }
      className="toaster group"
      expand
      icons={toastIcons}
      closeButton
      toastOptions={{
        classNames: {
          // Container: popover surface, hairline border, lifted, items-start so
          // the icon badge tops out with the title (prototype `.toast`).
          toast:
            "group toast !items-start gap-[11px] !rounded-lg !border-border !bg-popover !p-[13px_14px] !shadow-lg group-[.toaster]:text-foreground",
          icon: "!m-0 !size-[26px] !self-start",
          content: "gap-0.5",
          title: "!text-[13.5px] !font-semibold !text-foreground",
          description: "!text-[12.5px] !leading-relaxed !text-muted-foreground",
          // Carrot text button (prototype `.toast__action`).
          actionButton:
            "!bg-transparent !px-0 !font-semibold !text-primary hover:!underline",
          closeButton:
            "!border-border !bg-popover !text-muted-foreground hover:!text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { toast } from "sonner";
export { Toaster };
