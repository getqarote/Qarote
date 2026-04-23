// Shared email template styles for consistency across all templates

// Base styles
export const baseStyles = {
  main: {
    backgroundColor: "#f6f9fc",
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
    borderBottom: "1px solid #e5e7eb",
  },

  headerWithLogo: {
    display: "flex" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 40px 20px",
    borderBottom: "1px solid #e5e7eb",
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
    color: "#1f2937",
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
    color: "#1f2937",
    textAlign: "center" as const,
    margin: "0 0 32px",
  },

  subtitle: {
    fontSize: "24px",
    lineHeight: "28px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: "0 0 24px",
    textAlign: "center" as const,
  },

  heading: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1f2937",
    margin: "0 0 16px",
  },

  paragraph: {
    fontSize: "16px",
    lineHeight: "24px",
    color: "#374151",
    margin: "0 0 16px",
  },

  signature: {
    fontSize: "16px",
    lineHeight: "24px",
    color: "#374151",
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
    // backgroundColor: "#f9fafb",
    // borderRadius: "8px",
    // border: "1px solid #e5e7eb",
  },

  warningSection: {
    margin: "32px 0",
    padding: "24px",
    backgroundColor: "#fef2f2",
    borderRadius: "8px",
    border: "1px solid #fecaca",
  },

  successSection: {
    margin: "32px 0",
    padding: "24px",
    backgroundColor: "#f0fdf4",
    borderRadius: "8px",
    border: "1px solid #bbf7d0",
  },

  infoSection: {
    margin: "32px 0",
    padding: "24px",
    backgroundColor: "#f0f9ff",
    borderRadius: "8px",
    border: "1px solid #bfdbfe",
  },

  highlightSection: {
    background: "#e8f5e8",
    border: "1px solid #c3e6c3",
    padding: "15px",
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
    backgroundColor: "#f3f4f6",
    borderRadius: "6px",
    color: "#374151",
    fontSize: "14px",
    fontWeight: "500",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    margin: "0 8px",
    padding: "8px 16px",
  },

  linkButton: {
    display: "inline-block",
    background: "#667eea",
    color: "white",
    padding: "12px 30px",
    textDecoration: "none",
    borderRadius: "5px",
    fontWeight: "bold",
  },
} as const;

// Text styles
export const textStyles = {
  link: {
    color: "#3b82f6",
    textDecoration: "underline",
  },

  linkText: {
    fontSize: "14px",
    lineHeight: "20px",
    color: "#6b7280",
    margin: "0 0 16px",
    wordBreak: "break-all" as const,
  },

  featureText: {
    fontSize: "15px",
    lineHeight: "20px",
    color: "#374151",
    margin: "0",
  },

  warningText: {
    fontSize: "15px",
    lineHeight: "20px",
    color: "#991b1b",
    margin: "0",
  },

  successText: {
    fontSize: "15px",
    lineHeight: "20px",
    color: "#059669",
    margin: "0",
  },

  infoText: {
    fontSize: "15px",
    lineHeight: "20px",
    color: "#1e40af",
    margin: "0",
  },
} as const;

// Footer styles
export const footerStyles = {
  footer: {
    padding: "32px 32px 0",
    textAlign: "center" as const,
    borderTop: "1px solid #e5e7eb",
    paddingTop: "32px",
  },

  footerSimple: {
    padding: "0 40px 40px",
    textAlign: "center" as const,
    borderTop: "1px solid #e5e7eb",
    paddingTop: "32px",
  },

  footerText: {
    fontSize: "14px",
    lineHeight: "20px",
    color: "#6b7280",
    margin: "0 0 8px",
  },

  footerTextSmall: {
    fontSize: "12px",
    lineHeight: "16px",
    color: "#6b7280",
    margin: "0 0 8px",
  },
} as const;

// Code block styles
export const codeStyles = {
  commandBlock: {
    fontFamily: "monospace",
    fontSize: "14px",
    backgroundColor: "#1f2937",
    color: "#f9fafb",
    padding: "12px 16px",
    borderRadius: "6px",
    margin: "0",
    whiteSpace: "pre-line" as const,
  },
} as const;

// Utility styles
export const utilityStyles = {
  hr: {
    borderColor: "#e5e7eb",
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
    color: "#6b7280",
    margin: "0",
    fontWeight: "500",
  },

  detailValue: {
    fontSize: "15px",
    color: "#1f2937",
    margin: "0",
    fontWeight: "600",
  },
} as const;

// Color variants for different email types
export const colorVariants = {
  success: {
    primary: "#059669",
    background: "#f0fdf4",
    border: "#bbf7d0",
    text: "#065f46",
  },
  warning: {
    primary: "#d97706",
    background: "#fffbeb",
    border: "#fed7aa",
    text: "#92400e",
  },
  error: {
    primary: "#dc2626",
    background: "#fef2f2",
    border: "#fecaca",
    text: "#991b1b",
  },
  info: {
    primary: "#2563eb",
    background: "#f0f9ff",
    border: "#bfdbfe",
    text: "#1e40af",
  },
  neutral: {
    primary: "#6b7280",
    background: "#f9fafb",
    border: "#e5e7eb",
    text: "#374151",
  },
} as const;
