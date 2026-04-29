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
  colorVariants,
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
        Qarote {latestVersion} is available — you're on {currentVersion}
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

            {/* Version delta — monospace, prominent */}
            <Section style={sectionStyles.infoSection}>
              <Text style={versionStyles.label}>installed</Text>
              <Text style={versionStyles.currentVersion}>{currentVersion}</Text>
              <Text style={versionStyles.label}>available</Text>
              <Text style={versionStyles.latestVersion}>{latestVersion}</Text>
            </Section>

            {/* Update command */}
            <Section style={sectionStyles.highlightSection}>
              <Text style={contentStyles.heading}>
                {updateInstructions.title}
              </Text>
              <Text style={versionStyles.commandDescription}>
                {updateInstructions.description}
              </Text>
              <Text style={codeStyles.commandBlock}>
                {updateInstructions.command}
              </Text>
            </Section>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={releaseUrl}>
                View Release Notes
              </Button>
              <Button
                style={buttonStyles.secondaryButton}
                href="https://qarote.io/changelog"
              >
                Changelog
              </Button>
            </Section>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const versionStyles = {
  label: {
    ...textStyles.metric,
    color: colorVariants.neutral.primary,
    fontSize: "13px",
    margin: "0 0 4px",
  },
  currentVersion: {
    ...textStyles.metric,
    fontSize: "18px",
    color: colorVariants.neutral.primary,
    margin: "0 0 16px",
    textDecoration: "line-through" as const,
  },
  latestVersion: {
    ...textStyles.metric,
    fontSize: "24px",
    fontWeight: "700",
    color: contentStyles.heading.color,
    margin: "0",
  },
  commandDescription: {
    ...contentStyles.paragraph,
    marginBottom: "12px",
  },
} as const;
