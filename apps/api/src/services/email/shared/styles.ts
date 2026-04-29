// Shared email template styles — Qarote brand design system

// Base styles
export const baseStyles = {
  main: {
    backgroundColor: "#faf8f6",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  },

  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    borderRadius: "8px",
    maxWidth: "600px",
  },
} as const;

// Header styles
export const headerStyles = {
  header: {
    padding: "32px 32px 20px",
    textAlign: "center" as const,
    borderBottom: "1px solid #e7e5e0",
  },

  headerWithLogo: {
    display: "flex" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 40px 20px",
    borderBottom: "1px solid #e7e5e0",
  },

  logo: {
    margin: "0 auto 16px",
  },

  logoInline: {
    borderRadius: "50%",
    marginRight: "12px",
  },

  headerText: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1c1917",
    margin: "0",
    lineHeight: "28px",
  },
} as const;

// Content styles
export const contentStyles = {
  content: {
    padding: "0 32px",
  },

  contentPadded: {
    padding: "40px",
  },

  title: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1c1917",
    textAlign: "center" as const,
    margin: "0 0 32px",
  },

  subtitle: {
    fontSize: "24px",
    lineHeight: "28px",
    fontWeight: "bold",
    color: "#1c1917",
    margin: "0 0 24px",
    textAlign: "center" as const,
  },

  heading: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1c1917",
    margin: "0 0 12px",
    letterSpacing: "0.01em",
  },

  paragraph: {
    fontSize: "16px",
    lineHeight: "26px",
    color: "#44403c",
    margin: "0 0 16px",
  },

  signature: {
    fontSize: "16px",
    lineHeight: "24px",
    color: "#44403c",
    margin: "24px 0 0",
    fontWeight: "500",
  },
} as const;

// Section styles
export const sectionStyles = {
  section: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "32px",
    margin: "0 auto",
  },

  featuresSection: {
    margin: "32px 0",
    padding: "24px",
  },

  warningSection: {
    margin: "32px 0",
    padding: "24px",
    backgroundColor: "#fff7ed",
    borderRadius: "8px",
    border: "1px solid #fdba74",
  },

  errorSection: {
    margin: "32px 0",
    padding: "24px",
    backgroundColor: "#fef2f2",
    borderRadius: "8px",
    border: "1px solid #fca5a5",
  },

  successSection: {
    margin: "32px 0",
    padding: "24px",
    backgroundColor: "#f0fdf4",
    borderRadius: "8px",
    border: "1px solid #86efac",
  },

  infoSection: {
    margin: "32px 0",
    padding: "24px",
    backgroundColor: "#faf8f6",
    borderRadius: "8px",
    border: "1px solid #e7e5e0",
  },

  highlightSection: {
    background: "#fff7ed",
    border: "1px solid #fdba74",
    padding: "20px",
    borderRadius: "8px",
    margin: "20px 0",
  },
} as const;

// Button styles
export const buttonStyles = {
  buttonSection: {
    textAlign: "center" as const,
    margin: "32px 0",
  },

  primaryButton: {
    background: "linear-gradient(to right, rgb(234, 88, 12), rgb(220, 38, 38))",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 24px",
    border: "none",
  },

  secondaryButton: {
    backgroundColor: "#f5f4f2",
    borderRadius: "6px",
    color: "#44403c",
    fontSize: "14px",
    fontWeight: "500",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    margin: "0 8px",
    padding: "8px 16px",
  },
} as const;

// Text styles
export const textStyles = {
  link: {
    color: "#c2410c",
    textDecoration: "underline",
  },

  linkText: {
    fontSize: "14px",
    lineHeight: "20px",
    color: "#78716c",
    margin: "0 0 16px",
    wordBreak: "break-all" as const,
  },

  featureText: {
    fontSize: "15px",
    lineHeight: "22px",
    color: "#44403c",
    margin: "0 0 6px",
  },

  warningText: {
    fontSize: "15px",
    lineHeight: "22px",
    color: "#9a3412",
    margin: "0 0 4px",
  },

  successText: {
    fontSize: "15px",
    lineHeight: "22px",
    color: "#166534",
    margin: "0 0 4px",
  },

  infoText: {
    fontSize: "15px",
    lineHeight: "22px",
    color: "#44403c",
    margin: "0 0 4px",
  },

  // Fragment Mono for all numeric/technical values
  metric: {
    fontFamily:
      "'Fragment Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    fontSize: "15px",
    lineHeight: "22px",
    color: "#1c1917",
    margin: "0",
  },
} as const;

// Footer styles
export const footerStyles = {
  footer: {
    padding: "32px 32px 0",
    textAlign: "center" as const,
    borderTop: "1px solid #e7e5e0",
    paddingTop: "32px",
  },

  footerSimple: {
    padding: "0 40px 40px",
    textAlign: "center" as const,
    borderTop: "1px solid #e7e5e0",
    paddingTop: "32px",
  },

  footerText: {
    fontSize: "14px",
    lineHeight: "20px",
    color: "#78716c",
    margin: "0 0 8px",
  },

  footerTextSmall: {
    fontSize: "12px",
    lineHeight: "16px",
    color: "#a8a29e",
    margin: "0 0 8px",
  },
} as const;

// Code block styles
export const codeStyles = {
  commandBlock: {
    fontFamily:
      "'Fragment Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    fontSize: "14px",
    backgroundColor: "#1c1917",
    color: "#fafaf9",
    padding: "12px 16px",
    borderRadius: "6px",
    margin: "0",
    whiteSpace: "pre-line" as const,
  },
} as const;

// Utility styles
export const utilityStyles = {
  hr: {
    borderColor: "#e7e5e0",
    margin: "32px 0",
  },

  spacer: {
    margin: "24px 0",
  },

  spacerLarge: {
    margin: "32px 0",
  },

  textCenter: {
    textAlign: "center" as const,
  },

  textLeft: {
    textAlign: "left" as const,
  },
} as const;

// Row and layout styles
export const layoutStyles = {
  row: {
    display: "flex",
    justifyContent: "space-between",
    margin: "0 0 12px",
    alignItems: "center",
  },

  rowItem: {
    margin: "0 0 8px",
  },

  detailRow: {
    margin: "0 0 12px",
  },

  detailLabel: {
    fontSize: "15px",
    color: "#78716c",
    margin: "0",
    fontWeight: "500",
  },

  detailValue: {
    fontSize: "15px",
    color: "#1c1917",
    margin: "0",
    fontWeight: "600",
  },
} as const;

// Severity color system — derived from brand palette
export const colorVariants = {
  success: {
    primary: "#16a34a",
    background: "#f0fdf4",
    border: "#86efac",
    text: "#166534",
  },
  warning: {
    primary: "#ea580c",
    background: "#fff7ed",
    border: "#fdba74",
    text: "#9a3412",
  },
  error: {
    primary: "#dc2626",
    background: "#fef2f2",
    border: "#fca5a5",
    text: "#991b1b",
  },
  info: {
    primary: "#78716c",
    background: "#faf8f6",
    border: "#e7e5e0",
    text: "#44403c",
  },
  neutral: {
    primary: "#78716c",
    background: "#faf8f6",
    border: "#e7e5e0",
    text: "#44403c",
  },
} as const;
