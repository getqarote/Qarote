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

interface InvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  invitationToken: string;
  frontendUrl: string;
  locale?: string;
}

export const InvitationEmail = ({
  inviterName,
  inviterEmail,
  workspaceName,
  invitationToken,
  frontendUrl,
  locale = "en",
}: InvitationEmailProps) => {
  const inviteUrl = `${frontendUrl}/invite/${invitationToken}`;

  return (
    <Html>
      <Head />
      <Preview>
        {tEmail(locale, "invitation.preview", { inviterName, workspaceName })}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "invitation.title", { workspaceName })}
            </Text>

            <Text style={contentStyles.paragraph}>
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
              join <strong>{workspaceName}</strong> on Qarote.
            </Text>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={inviteUrl}>
                {tEmail(locale, "invitation.acceptButton")}
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
