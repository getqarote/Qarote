/* ============================================================================
 * QAROTE STROKE ICONS — the new design system's icon set.
 * ----------------------------------------------------------------------------
 * Decision (Brice, Jun 12 2026): the prototype's clean stroke icons replace the
 * pixel-art `Pixel*` family. The 36 glyphs below are ported verbatim from
 * docs/reference/icons.reference.tsx; the block after them adds the glyphs the
 * prototype set lacked but the app still needs — so the whole Pixel* family maps
 * here without a lucide fallback. (Scope: this set REPLACES the Pixel* family.
 * lucide-react remains the app's broader icon library elsewhere; a later pass can
 * consolidate those into this set.)
 *
 * API matches lucide-react (size / className / strokeWidth), so these drop into:
 *   - AppSidebar's `IconComponent = ComponentType<{ size?; className? }>` slots
 *   - any inline `<IconHome size={16} />` usage
 *   - the `ICONS` name→component map below.
 *
 * Geometry: 24×24 viewBox, fill=none, stroke=currentColor, round caps/joins,
 * default strokeWidth 1.6 (prototype value). Color comes from `currentColor`
 * → text-* tokens, so they're theme-aware for free. No hardcoded colors.
 *
 * MIGRATION MAP (old pixel → new stroke), applied across the app:
 *   PixelChart → IconHome          PixelFlag/PixelAlert → IconBell
 *   PixelNetwork → IconTopo        PixelServer → IconServer
 *   PixelKey → IconKey             PixelShield → IconLock
 *   PixelCrown → IconSparkle       PixelStar → IconStar
 *   PixelChevron{Left,Right,Up,Down} → IconChevron{Left,Right,Up,(down)}
 *   PixelSettings → IconSettings   PixelUser → IconUser
 *   PixelUserPlus → IconUserPlus   PixelCheck → IconCheck
 *   PixelX → IconClose             PixelHelp → IconHelp
 *   PixelLogout → IconLogout       PixelLogin → IconLogin
 *   PixelMoon → IconMoon           PixelMonitor → IconMonitor
 *   PixelCreditCard → IconCard     PixelReceipt → IconReceipt
 *   PixelFolder → IconFolder       PixelDatabase → IconDatabase
 *   PixelLayers → IconLayers       PixelBuilding → IconBuilding
 *   PixelCalendar → IconCalendar   PixelClock → IconClock
 *   PixelEmail → IconMail          PixelMessage → IconMessage
 *   PixelTrash → IconTrash         PixelEdit/PixelPen → IconEdit
 *   PixelZap → IconZap             PixelPalette → IconPalette
 *   PixelActivity → IconActivity
 * The pixel-*.tsx files were removed once references were gone; the rabbit
 * animations are unrelated and stay.
 * ==========================================================================*/

import { cn } from "@/lib/utils";

import type { ComponentType, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  /** px size for width & height (default 18, matching the prototype) */
  size?: number;
  /** stroke width (default 1.6) */
  strokeWidth?: number;
  className?: string;
}

/** Internal wrapper: shared svg attrs + sizing. */
function Svg({
  size = 18,
  strokeWidth = 1.6,
  className,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  // `w-auto` lets height-only sizing (e.g. className="h-4") drive width via the
  // 1:1 viewBox ratio, matching the old Pixel* behavior (which set no width attr).
  // twMerge keeps an explicit w-* from className when the caller provides one.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0 w-auto", className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---- the 36 glyphs (paths verbatim from the prototype) ------------------- */
export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9h5v-5h4v5h5v-9" />
  </Svg>
);
export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Svg>
);
export const IconTopo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="6" r="2.2" />
    <circle cx="19" cy="6" r="2.2" />
    <circle cx="12" cy="18" r="2.2" />
    <path d="M7 6h10M6 8l5 8M18 8l-5 8" />
  </Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 0 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9 2 2 0 0 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5 2 2 0 0 1 4 0 1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1 2 2 0 0 1 0 4 1.7 1.7 0 0 0-1.5 1Z" />
  </Svg>
);
export const IconHelp = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .8-1 1.7" />
    <path d="M12 17h.01" />
  </Svg>
);
export const IconChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const IconChevronUpDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m8 9 4-4 4 4" />
    <path d="m8 15 4 4 4-4" />
  </Svg>
);
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 4.5 4.5L19 6" />
  </Svg>
);
export const IconThumbUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Z" />
    <path d="M7 11l4-7a2 2 0 0 1 2 1v4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7" />
  </Svg>
);
export const IconThumbDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Z" />
    <path d="M17 13l-4 7a2 2 0 0 1-2-1v-4H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17" />
  </Svg>
);
export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </Svg>
);
export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5" />
  </Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
    <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" />
  </Svg>
);
export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="4" />
    <path d="m11 11 8 8M16 16l2-2M19 13l2 2" />
  </Svg>
);
export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
  </Svg>
);
export const IconCluster = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);
export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </Svg>
);
export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
  </Svg>
);
export const IconServer = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="7" rx="2" />
    <rect x="3" y="13" width="18" height="7" rx="2" />
    <path d="M7 7.5h.01M7 16.5h.01" />
  </Svg>
);
export const IconFolder = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
  </Svg>
);
export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4l14 8-14 8Z" />
  </Svg>
);
export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </Svg>
);
export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12.8A8 8 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" />
  </Svg>
);
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </Svg>
);
export const IconQueue = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="8" width="18" height="8" rx="2" />
    <path d="M8 8v8M13 8v8" />
  </Svg>
);
export const IconExchange = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M8 12h8m-3-3 3 3-3 3" />
  </Svg>
);
export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);
export const IconDoc = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h7l5 5v13H6Z" />
    <path d="M13 3v5h5" />
  </Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const IconCard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18" />
  </Svg>
);
export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a16.8 16.8 0 0 1-3.4 4M6.2 6.2A16.7 16.7 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Svg>
);

/* ---- added glyphs: concepts the prototype set lacked but the app needs ---- */
export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);
export const IconChevronUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
);
export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);
export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Svg>
);
export const IconBuilding = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="1.5" />
    <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
    <path d="M10 21v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3" />
  </Svg>
);
export const IconLayers = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </Svg>
);
export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </Svg>
);
export const IconMessage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 4V6Z" />
  </Svg>
);
export const IconZap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />
  </Svg>
);
export const IconStar = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 4 2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.8 9.6 9 12 4Z" />
  </Svg>
);
export const IconPalette = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-7.9-9-7.9Z" />
    <circle cx="7.5" cy="11" r="1.1" />
    <circle cx="10" cy="7.5" r="1.1" />
    <circle cx="14.5" cy="7.5" r="1.1" />
  </Svg>
);
export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
);
export const IconActivity = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h4l2.5-7 5 14 2.5-7H21" />
  </Svg>
);
export const IconReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6" />
  </Svg>
);
export const IconMonitor = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Svg>
);
export const IconDatabase = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
    <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </Svg>
);
export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);
export const IconLogin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </Svg>
);
export const IconUserPlus = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M18 8v6M15 11h6" />
  </Svg>
);

/* ---- name → component map (mirrors the prototype's <Icon name="…"/>) ------ */
export const ICONS: Record<string, ComponentType<IconProps>> = {
  home: IconHome,
  bell: IconBell,
  topo: IconTopo,
  search: IconSearch,
  settings: IconSettings,
  help: IconHelp,
  chevron: IconChevron,
  chevronUpDown: IconChevronUpDown,
  chevronRight: IconChevronRight,
  chevronLeft: IconChevronLeft,
  chevronUp: IconChevronUp,
  plus: IconPlus,
  copy: IconCopy,
  check: IconCheck,
  thumbUp: IconThumbUp,
  thumbDown: IconThumbDown,
  refresh: IconRefresh,
  logout: IconLogout,
  login: IconLogin,
  close: IconClose,
  sparkle: IconSparkle,
  key: IconKey,
  external: IconExternal,
  cluster: IconCluster,
  grid: IconGrid,
  filter: IconFilter,
  server: IconServer,
  folder: IconFolder,
  play: IconPlay,
  sun: IconSun,
  moon: IconMoon,
  arrowRight: IconArrowRight,
  queue: IconQueue,
  exchange: IconExchange,
  user: IconUser,
  userPlus: IconUserPlus,
  doc: IconDoc,
  lock: IconLock,
  card: IconCard,
  eye: IconEye,
  eyeOff: IconEyeOff,
  trash: IconTrash,
  mail: IconMail,
  building: IconBuilding,
  layers: IconLayers,
  calendar: IconCalendar,
  message: IconMessage,
  zap: IconZap,
  star: IconStar,
  palette: IconPalette,
  edit: IconEdit,
  activity: IconActivity,
  receipt: IconReceipt,
  monitor: IconMonitor,
  database: IconDatabase,
  clock: IconClock,
};

/** Convenience: <Icon name="server" size={16} /> — matches prototype call-sites. */
export function Icon({
  name,
  ...rest
}: IconProps & { name: keyof typeof ICONS }) {
  const C = ICONS[name];
  return C ? <C {...rest} /> : null;
}
