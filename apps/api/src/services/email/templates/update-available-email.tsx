import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { JSX } from "react";

import {
  baseStyles,
  buttonStyles,
  contentStyles,
  sectionStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

interface UpdateAvailableEmailProps {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
}

export default function UpdateAvailableEmail({
  currentVersion,
  latestVersion,
  releaseUrl,
}: UpdateAvailableEmailProps): JSX.Element {
  return (
    <Html>
      <Head />
      <Preview>
        Qarote {latestVersion} is available (you have {currentVersion})
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>New Update Available</Text>

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
              <Text style={contentStyles.heading}>How to Update</Text>
              <Text style={contentStyles.paragraph}>
                Run the following command from your Qarote directory:
              </Text>
              <Text
                style={{
                  fontFamily: "monospace",
                  fontSize: "14px",
                  backgroundColor: "#1f2937",
                  color: "#f9fafb",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  margin: "0",
                }}
              >
                ./scripts/update.sh
              </Text>
            </Section>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={releaseUrl}>
                View Release on GitHub
              </Button>
            </Section>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.signature}>The Qarote Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
