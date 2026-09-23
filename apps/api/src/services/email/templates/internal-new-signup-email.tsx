import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import React from "react";

import type { SignupMethod } from "@/services/notification/notification-outbox.service";

import {
  baseStyles,
  contentStyles,
  sectionStyles,
  utilityStyles,
} from "../shared/styles";

export interface InternalNewSignupEmailProps {
  /** Email address of the account that was just created. */
  signupEmail: string;
  /** Display name, when the user supplied one at sign-up. */
  signupName?: string;
  userId: string;
  signupMethod: SignupMethod;
  referralSource?: string;
  discoveryQuery?: string;
  acquisitionChannel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  invitedByEmail?: string;
  invitedToName?: string;
}

const METHOD_LABELS: Record<SignupMethod, string> = {
  form: "Direct sign-up",
  external: "Google / SSO",
  invitation: "Invitation",
};

/**
 * Internal ops notification — sent to Qarote, never to a customer. English
 * only (single reader), no marketing header/footer, no unsubscribe: it is a
 * private ops ping, not a transactional customer email.
 */
export const InternalNewSignupEmail: React.FC<InternalNewSignupEmailProps> = ({
  signupEmail,
  signupName,
  userId,
  signupMethod,
  referralSource,
  discoveryQuery,
  acquisitionChannel,
  utmSource,
  utmMedium,
  utmCampaign,
  invitedByEmail,
  invitedToName,
}) => {
  const fields: Array<[string, string | undefined]> = [
    ["User ID", userId],
    ["Method", METHOD_LABELS[signupMethod]],
    ["Invited by", invitedByEmail],
    ["Joined", invitedToName],
    ["Referral source", referralSource],
    ["Discovery query", discoveryQuery],
    ["Acquisition channel", acquisitionChannel],
    ["UTM source", utmSource],
    ["UTM medium", utmMedium],
    ["UTM campaign", utmCampaign],
  ];

  // Only fields that actually carry a value are rendered, so the email stays
  // scannable instead of listing a column of "—".
  const rows = fields.filter(([, value]) => Boolean(value));

  return (
    <Html>
      <Head />
      <Preview>{`New Qarote signup — ${signupEmail}`}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={sectionStyles.section}>
            <Heading style={styles.title}>New signup</Heading>

            <Text style={styles.email}>
              <Link href={`mailto:${signupEmail}`} style={styles.emailLink}>
                {signupEmail}
              </Link>
            </Text>

            {signupName ? (
              <Text style={contentStyles.paragraph}>{signupName}</Text>
            ) : null}

            <Hr style={utilityStyles.hr} />

            {rows.map(([label, value]) => (
              <Text key={label} style={styles.row}>
                <span style={styles.label}>{label}</span>
                {value}
              </Text>
            ))}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const styles = {
  title: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1c1917",
    margin: "0 0 8px",
  },
  email: {
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 4px",
  },
  emailLink: {
    color: "#1c1917",
    textDecoration: "none",
  },
  row: {
    fontSize: "14px",
    lineHeight: "22px",
    color: "#44403c",
    margin: "0 0 6px",
  },
  label: {
    display: "inline-block",
    minWidth: "160px",
    color: "#78716c",
  },
} as const;
