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
  Img,
} from "@react-email/components";

interface InvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  invitationToken: string;
  plan: "FREE" | "DEVELOPER" | "STARTUP" | "BUSINESS";
  userCostPerMonth?: number;
  frontendUrl: string;
}

export const InvitationEmail = ({
  inviterName,
  inviterEmail,
  workspaceName,
  invitationToken,
  plan,
  userCostPerMonth,
  frontendUrl,
}: InvitationEmailProps) => {
  const inviteUrl = `${frontendUrl}/invite/${invitationToken}`;

  const planDisplayName = {
    FREE: "Free",
    DEVELOPER: "Developer",
    STARTUP: "Startup",
    BUSINESS: "Business",
  }[plan];

  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {workspaceName} on RabbitHQ</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src={`${frontendUrl}/icon_rabbit.svg`}
              width="48"
              height="48"
              alt="RabbitHQ"
              style={logo}
            />
          </Section>

          <Section style={content}>
            <Text style={heading}>You're invited to RabbitHQ!</Text>

            <Text style={paragraph}>
              <strong>{inviterName}</strong> ({inviterEmail}) has invited you to
              join <strong>{workspaceName}</strong> on RabbitHQ.
            </Text>

            <Section style={inviteDetailsContainer}>
              <Text style={inviteDetailsHeading}>Invitation Details</Text>
              <Text style={inviteDetail}>
                <strong>Workspace:</strong> {workspaceName}
              </Text>
              <Text style={inviteDetail}>
                <strong>Plan:</strong> {planDisplayName}
              </Text>
              {userCostPerMonth && (
                <Text style={inviteDetail}>
                  <strong>Monthly Cost:</strong> ${userCostPerMonth}/month per
                  additional user
                </Text>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={inviteUrl}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Link href={inviteUrl} style={link}>
              {inviteUrl}
            </Link>

            <Hr style={hr} />

            <Text style={footer}>
              RabbitHQ helps you monitor and manage your RabbitMQ clusters with
              ease. This invitation will expire in 7 days.
            </Text>

            <Text style={footerNote}>
              If you didn't expect this invitation, you can safely ignore this
              email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const logoContainer = {
  margin: "32px 0",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
};

const content = {
  padding: "0 48px",
};

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const paragraph = {
  fontSize: "18px",
  lineHeight: "1.4",
  color: "#484848",
  margin: "0 0 24px",
};

const inviteDetailsContainer = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
};

const inviteDetailsHeading = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#374151",
  margin: "0 0 16px",
};

const inviteDetail = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#6b7280",
  margin: "0 0 8px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  background: "linear-gradient(to right, rgb(234, 88, 12), rgb(220, 38, 38))",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "18px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
  lineHeight: "1",
};

const link = {
  color: "#2563eb",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 16px",
};

const footerNote = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "1.4",
};

export default InvitationEmail;
