import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy - RabbitHQ"
        description="Privacy Policy for RabbitHQ - Learn how we collect, use, and protect your data."
        url="https://rabbithq.io/privacy-policy"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              1. Information We Collect
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-xl font-medium text-foreground">
                1.1 Account Information
              </h3>
              <p>When you create an account with RabbitHQ, we collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email address</li>
                <li>First and last name</li>
                <li>Password (encrypted)</li>
                <li>Company information (optional)</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">
                1.2 Usage Data
              </h3>
              <p>
                We automatically collect information about how you use our
                service:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  RabbitMQ server connection details (host, port, credentials)
                </li>
                <li>Queue monitoring data and metrics</li>
                <li>Application performance metrics</li>
                <li>Error logs and debugging information</li>
                <li>Feature usage patterns</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">
                1.3 Technical Information
              </h3>
              <p>
                We collect technical information about your device and browser:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Device information</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              2. How We Use Your Information
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and maintain our RabbitMQ monitoring service</li>
                <li>Process payments and manage your subscription</li>
                <li>Send you important service updates and notifications</li>
                <li>Provide customer support</li>
                <li>Improve our service and develop new features</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              3. Information Sharing and Disclosure
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We do not sell, trade, or rent your personal information to
                third parties. We may share your information only in the
                following circumstances:
              </p>

              <h3 className="text-xl font-medium text-foreground">
                3.1 Service Providers
              </h3>
              <p>
                We may share information with trusted third-party service
                providers who assist us in operating our service:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payment processors (Stripe)</li>
                <li>Email service providers</li>
                <li>Analytics services</li>
                <li>Cloud hosting providers</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">
                3.2 Legal Requirements
              </h3>
              <p>We may disclose your information if required by law or to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comply with legal processes</li>
                <li>Protect our rights and property</li>
                <li>Prevent fraud or security issues</li>
                <li>Protect the safety of our users</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              4. Data Security
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We implement appropriate security measures to protect your
                personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and assessments</li>
                <li>Access controls and authentication</li>
                <li>Secure data centers and infrastructure</li>
                <li>Employee training on data protection</li>
              </ul>
              <p>
                However, no method of transmission over the internet or
                electronic storage is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              5. Data Retention
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We retain your personal information for as long as necessary to
                provide our service and fulfill the purposes outlined in this
                privacy policy. Specifically:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account information: Until you delete your account</li>
                <li>Usage data: Up to 2 years for analytics purposes</li>
                <li>
                  Payment information: As required by law and payment processors
                </li>
                <li>Support communications: Up to 3 years</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              6. Your Rights
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Depending on your location, you may have the following rights
                regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Access:</strong> Request a copy of your personal
                  information
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate
                  information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal
                  information
                </li>
                <li>
                  <strong>Portability:</strong> Request transfer of your data to
                  another service
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain processing
                  activities
                </li>
                <li>
                  <strong>Restriction:</strong> Request limitation of processing
                </li>
              </ul>
              <p>
                To exercise these rights, please contact us at
                privacy@rabbithq.io
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              7. Cookies and Tracking
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We use cookies and similar technologies to enhance your
                experience:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Essential cookies:</strong> Required for basic
                  functionality
                </li>
                <li>
                  <strong>Analytics cookies:</strong> Help us understand usage
                  patterns
                </li>
                <li>
                  <strong>Preference cookies:</strong> Remember your settings
                </li>
                <li>
                  <strong>Marketing cookies:</strong> Used for targeted
                  advertising (with consent)
                </li>
              </ul>
              <p>
                You can control cookie settings through your browser
                preferences.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              8. International Data Transfers
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Your information may be transferred to and processed in
                countries other than your own. We ensure appropriate safeguards
                are in place for such transfers, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Standard contractual clauses</li>
                <li>Adequacy decisions</li>
                <li>Certification schemes</li>
                <li>Binding corporate rules</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              9. Children's Privacy
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Our service is not intended for children under 13 years of age.
                We do not knowingly collect personal information from children
                under 13. If you become aware that a child has provided us with
                personal information, please contact us immediately.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              10. Changes to This Privacy Policy
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We may update this privacy policy from time to time. We will
                notify you of any material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posting the updated policy on our website</li>
                <li>Sending you an email notification</li>
                <li>Displaying a notice in our application</li>
              </ul>
              <p>
                Your continued use of our service after any changes constitutes
                acceptance of the updated policy.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              11. Contact Us
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                If you have any questions about this privacy policy or our data
                practices, please contact us:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Email:</strong> support@rabbithq.io
                </li>
                <li>
                  <strong>Address:</strong> 229 rue Saint-Honoré, 75001, Paris,
                  France
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
