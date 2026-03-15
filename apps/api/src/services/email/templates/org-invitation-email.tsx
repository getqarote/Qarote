import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  baseStyles,
  buttonStyles,
  contentStyles,
  headerStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

interface OrgInvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  orgName: string;
  invitationToken: string;
  frontendUrl: string;
}

export const OrgInvitationEmail = ({
  inviterName,
  inviterEmail,
  orgName,
  invitationToken,
  frontendUrl,
}: OrgInvitationEmailProps) => {
  const inviteUrl = `${frontendUrl}/org-invite/${invitationToken}`;

  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {orgName} on Qarote</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={headerStyles.header}></Section>

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              You're invited to join an organization!
            </Text>

            <Text style={contentStyles.paragraph}>
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
              join the <strong>{orgName}</strong> organization on Qarote.
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

            <Text style={contentStyles.paragraph}>Happy monitoring!</Text>

            <Text style={contentStyles.signature}>The Qarote Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
