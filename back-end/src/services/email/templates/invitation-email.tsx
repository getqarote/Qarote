import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
} from "@react-email/components";
import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

interface InvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  invitationToken: string;
  frontendUrl: string;
}

export const InvitationEmail = ({
  inviterName,
  inviterEmail,
  workspaceName,
  invitationToken,
  frontendUrl,
}: InvitationEmailProps) => {
  const inviteUrl = `${frontendUrl}/invite/${invitationToken}`;

  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {workspaceName} on RabbitHQ</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={headerStyles.header}></Section>

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>You're invited to RabbitHQ!</Text>

            <Text style={contentStyles.paragraph}>
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
              join <strong>{workspaceName}</strong> on RabbitHQ.
            </Text>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={inviteUrl}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={textStyles.linkText}>
              <Link href={inviteUrl} style={textStyles.link}>
                {inviteUrl}
              </Link>
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>Happy monitoring! 🐰</Text>

            <Text style={contentStyles.signature}>The RabbitHQ Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Custom styles for this template
const _styles = {
  detailText: {
    fontSize: "16px",
    lineHeight: "1.5",
    color: "#6b7280",
    margin: "0 0 8px",
  },

  footerText: {
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "1.5",
    margin: "0 0 16px",
  },

  footerNote: {
    color: "#9ca3af",
    fontSize: "12px",
    lineHeight: "1.4",
  },
} as const;

export default InvitationEmail;
