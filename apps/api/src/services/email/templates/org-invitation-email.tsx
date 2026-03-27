import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { EmailFooter } from "../shared/email-footer";
import { EmailHeader } from "../shared/email-header";
import {
  baseStyles,
  buttonStyles,
  contentStyles,
  textStyles,
} from "../shared/styles";

import { tEmail } from "@/i18n";

interface OrgInvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  orgName: string;
  invitationToken: string;
  frontendUrl: string;
  locale?: string;
}

export const OrgInvitationEmail = ({
  inviterName,
  inviterEmail,
  orgName,
  invitationToken,
  frontendUrl,
  locale = "en",
}: OrgInvitationEmailProps) => {
  const inviteUrl = `${frontendUrl}/org-invite/${invitationToken}`;

  return (
    <Html>
      <Head />
      <Preview>
        {tEmail(locale, "orgInvitation.preview", { inviterName, orgName })}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "orgInvitation.title")}
            </Text>

            <Text style={contentStyles.paragraph}>
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
              join the <strong>{orgName}</strong> organization on Qarote.
            </Text>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={inviteUrl}>
                {tEmail(locale, "orgInvitation.acceptButton")}
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.ifButtonDoesntWork")}
            </Text>
            <Text style={textStyles.linkText}>
              <Link href={inviteUrl} style={textStyles.link}>
                {inviteUrl}
              </Link>
            </Text>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
