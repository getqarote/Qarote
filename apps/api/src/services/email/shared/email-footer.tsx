import { Hr, Link, Text } from "@react-email/components";

import {
  contentStyles,
  footerStyles,
  textStyles,
  utilityStyles,
} from "./styles";

import { tEmail } from "@/i18n";

interface EmailFooterProps {
  locale?: string;
  frontendUrl: string;
}

export function EmailFooter({ locale = "en", frontendUrl }: EmailFooterProps) {
  return (
    <>
      <Hr style={utilityStyles.hr} />

      <Text style={contentStyles.paragraph}>
        {tEmail(locale, "common.happyMonitoring")}
      </Text>

      <Text style={contentStyles.signature}>
        {tEmail(locale, "common.signature")}
      </Text>

      <Hr style={utilityStyles.hr} />

      <Text style={footerStyles.footerText}>
        {tEmail(locale, "common.supportFooter")}{" "}
        <Link href={`${frontendUrl}/help`} style={textStyles.link}>
          {tEmail(locale, "common.supportTeam")}
        </Link>
        .
      </Text>
    </>
  );
}
