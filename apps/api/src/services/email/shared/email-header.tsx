import { Img, Section, Text } from "@react-email/components";

import { headerStyles } from "./styles";

interface EmailHeaderProps {
  frontendUrl: string;
}

export function EmailHeader({ frontendUrl }: EmailHeaderProps) {
  return (
    <Section style={headerStyles.headerWithLogo}>
      <Img
        src={`${frontendUrl}/images/email-logo.png`}
        width="32"
        height="32"
        alt="Qarote"
        style={headerStyles.logoInline}
      />
      <Text style={headerStyles.headerText}>Qarote</Text>
    </Section>
  );
}
