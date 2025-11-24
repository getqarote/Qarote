# Email Template Styling Guide

## Rule: All Email Templates Must Use Shared Styles

### Required Pattern

**ALWAYS use styles from `back-end/src/services/email/shared/styles.ts` for email templates.**

### Style Import Pattern

```typescript
import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
  textStyles,
  utilityStyles,
  sectionStyles,
  layoutStyles,
  footerStyles,
  colorVariants,
} from "../shared/styles";
```

### When to Use Each Style Group

1. **baseStyles**: Main container and body styles
   - `baseStyles.main` - Body background
   - `baseStyles.container` - Main container

2. **headerStyles**: Header sections
   - `headerStyles.header` - Standard header
   - `headerStyles.headerWithLogo` - Header with logo
   - `headerStyles.headerText` - Header text

3. **contentStyles**: Main content text and sections
   - `contentStyles.content` - Content padding
   - `contentStyles.contentPadded` - Padded content
   - `contentStyles.title` - Main title
   - `contentStyles.subtitle` - Subtitle
   - `contentStyles.heading` - Section headings
   - `contentStyles.paragraph` - Body paragraphs
   - `contentStyles.signature` - Signature text

4. **sectionStyles**: Section containers
   - `sectionStyles.section` - Standard section
   - `sectionStyles.featuresSection` - Features section
   - `sectionStyles.warningSection` - Warning section
   - `sectionStyles.successSection` - Success section
   - `sectionStyles.infoSection` - Info section
   - `sectionStyles.highlightSection` - Highlight section

5. **buttonStyles**: Buttons and CTAs
   - `buttonStyles.primaryButton` - Primary action button
   - `buttonStyles.secondaryButton` - Secondary button
   - `buttonStyles.buttonSection` - Button container

6. **textStyles**: Text variants
   - `textStyles.link` - Links
   - `textStyles.linkText` - Link text
   - `textStyles.featureText` - Feature text
   - `textStyles.warningText` - Warning text
   - `textStyles.successText` - Success text
   - `textStyles.infoText` - Info text

7. **layoutStyles**: Layout and detail rows
   - `layoutStyles.row` - Flex row
   - `layoutStyles.detailRow` - Detail row
   - `layoutStyles.detailLabel` - Detail label
   - `layoutStyles.detailValue` - Detail value

8. **footerStyles**: Footer sections
   - `footerStyles.footer` - Standard footer
   - `footerStyles.footerText` - Footer text
   - `footerStyles.footerTextSmall` - Small footer text

9. **utilityStyles**: Utility classes
   - `utilityStyles.hr` - Horizontal rule
   - `utilityStyles.spacer` - Spacing
   - `utilityStyles.textCenter` - Center text

10. **colorVariants**: Color schemes
    - `colorVariants.success` - Success colors
    - `colorVariants.warning` - Warning colors
    - `colorVariants.error` - Error colors
    - `colorVariants.info` - Info colors
    - `colorVariants.neutral` - Neutral colors

### Rules

1. **DO NOT use inline styles** - Always use shared styles or define custom styles at the bottom of the file
2. **DO define custom styles** - If you need styles not in shared/styles.ts, define them as a `const styles` object at the bottom of the file
3. **DO extend shared styles** - You can spread shared styles and override specific properties:
   ```typescript
   style={{
     ...sectionStyles.warningSection,
     backgroundColor: colorVariants.error.background,
   }}
   ```
4. **DO use colorVariants** - For color consistency, always use `colorVariants` instead of hardcoded colors

### Examples

```typescript
// ✅ CORRECT - Using shared styles
<Section style={sectionStyles.featuresSection}>
  <Text style={contentStyles.heading}>Features</Text>
  <Text style={contentStyles.paragraph}>Description</Text>
</Section>

// ✅ CORRECT - Extending shared styles
<Section
  style={{
    ...sectionStyles.warningSection,
    backgroundColor: colorVariants.error.background,
  }}
>
  <Text style={{ ...contentStyles.heading, color: colorVariants.error.text }}>
    Error Message
  </Text>
</Section>

// ✅ CORRECT - Custom styles defined at bottom
const styles = {
  customSection: {
    margin: "20px 0",
    padding: "16px",
  },
} as const;

// ❌ WRONG - Inline styles
<Section
  style={{
    margin: "24px 0",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
  }}
>
```

### Why This Matters

- **Consistency**: Ensures all emails have a unified look and feel
- **Maintainability**: Changes to shared styles automatically apply to all templates
- **Branding**: Maintains consistent brand colors and spacing
- **Accessibility**: Shared styles ensure proper contrast and readability

