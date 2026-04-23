import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { JSX } from "react";

import { EmailFooter } from "../shared/email-footer";
import { EmailHeader } from "../shared/email-header";
import {
  baseStyles,
  buttonStyles,
  codeStyles,
  contentStyles,
  sectionStyles,
  textStyles,
} from "../shared/styles";

import { tEmail } from "@/i18n";

interface UpdateAvailableEmailProps {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  updateInstructions: {
    title: string;
    command: string;
    description: string;
  };
  frontendUrl: string;
  locale?: string;
}

export default function UpdateAvailableEmail({
  currentVersion,
  latestVersion,
  releaseUrl,
  updateInstructions,
  frontendUrl,
  locale = "en",
}: UpdateAvailableEmailProps): JSX.Element {
  return (
    <Html>
      <Head />
      <Preview>
        Qarote {latestVersion} is available (you have {currentVersion})
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "updateAvailable.title")}
            </Text>

            <Text style={contentStyles.paragraph}>
              A new version of Qarote is available for your self-hosted
              instance.
            </Text>

            <Section style={sectionStyles.infoSection}>
              <Text style={contentStyles.heading}>Version Details</Text>
              <Text style={textStyles.infoText}>
                <strong>Current version:</strong> {currentVersion}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>Latest version:</strong> {latestVersion}
              </Text>
            </Section>

            <Section style={sectionStyles.highlightSection}>
              <Text style={contentStyles.heading}>
                {updateInstructions.title}
              </Text>
              <Text style={contentStyles.paragraph}>
                {updateInstructions.description}
              </Text>
              <Text style={codeStyles.commandBlock}>
                {updateInstructions.command}
              </Text>
            </Section>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={releaseUrl}>
                View Release on GitHub
              </Button>
              <Button
                style={buttonStyles.secondaryButton}
                href="https://qarote.io/changelog"
              >
                View Changelog
              </Button>
            </Section>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
