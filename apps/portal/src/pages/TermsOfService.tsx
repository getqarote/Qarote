import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
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
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              1. Acceptance of Terms
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                By accessing and using Qarote ("the Service"), you accept and
                agree to be bound by the terms and provision of this agreement.
                If you do not agree to abide by the above, please do not use
                this service.
              </p>
              <p>
                These Terms of Service ("Terms") govern your use of our RabbitMQ
                monitoring and management platform operated by Qarote ("us",
                "we", or "our").
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              2. Description of Service
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Qarote provides a modern, web-based interface for monitoring and
                managing RabbitMQ message brokers. Our service includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Live queue monitoring and analytics</li>
                <li>Message publishing and consumption tools</li>
                <li>Queue and exchange management</li>
                <li>Performance metrics and alerting</li>
                <li>Multi-server cluster support</li>
                <li>User management and access controls</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              3. User Accounts and Registration
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-xl font-medium text-foreground">
                3.1 Account Creation
              </h3>
              <p>
                To use our service, you must create an account by providing
                accurate and complete information. You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Maintaining the confidentiality of your account credentials
                </li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Keeping your account information up to date</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">
                3.2 Account Eligibility
              </h3>
              <p>
                You must be at least 18 years old to create an account. By
                creating an account, you represent and warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You are of legal age to form a binding contract</li>
                <li>You have the authority to enter into this agreement</li>
                <li>All information provided is accurate and current</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              4. Subscription Plans and Billing
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-xl font-medium text-foreground">
                4.1 Subscription Plans
              </h3>
              <p>
                We offer multiple subscription plans with different features and
                limitations:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Free Plan:</strong> Limited to 1 server, basic
                  monitoring features
                </li>
                <li>
                  <strong>Developer Plan:</strong> Up to 2 servers, advanced
                  management features
                </li>
                <li>
                  <strong>Enterprise Plan:</strong> Unlimited servers, full
                  feature access, priority support
                </li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">
                4.2 Billing and Payment
              </h3>
              <p>
                Subscription fees are billed in advance on a monthly or annual
                basis. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pay all fees associated with your chosen plan</li>
                <li>Provide accurate billing information</li>
                <li>Authorize us to charge your payment method</li>
                <li>Notify us of any changes to your payment information</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">
                4.3 Refunds and Cancellation
              </h3>
              <p>
                You may cancel your subscription at any time. Refunds are
                provided according to our refund policy:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Monthly subscriptions: No refunds for partial months</li>
                <li>
                  Annual subscriptions: Pro-rated refunds for unused months
                </li>
                <li>
                  Cancellation takes effect at the end of the current billing
                  period
                </li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mt-6">
                4.4 Enterprise Self-Hosted Licenses
              </h3>
              <p>
                Enterprise Edition self-hosted licenses are subject to
                additional terms:
              </p>

              <h4 className="text-lg font-medium text-foreground mt-4">
                License Scope and Usage
              </h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Organization License:</strong> Each license is valid
                  for use by a single organization or company
                </li>
                <li>
                  <strong>Unlimited Servers:</strong> You may deploy the
                  software on unlimited servers within your organization
                </li>
                <li>
                  <strong>Non-Transferable:</strong> Licenses may not be
                  transferred, shared, or sold to other organizations or
                  entities
                </li>
                <li>
                  <strong>Internal Use Only:</strong> The license is for your
                  organization's internal use and may not be used to provide
                  services to third parties
                </li>
              </ul>

              <h4 className="text-lg font-medium text-foreground mt-4">
                License Validity and Renewal
              </h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Annual Term:</strong> Licenses are valid for one year
                  from the date of issuance
                </li>
                <li>
                  <strong>Automatic Renewal:</strong> Licenses automatically
                  renew unless canceled before the renewal date
                </li>
                <li>
                  <strong>Expiration:</strong> Upon expiration, premium features
                  will be disabled but your data remains accessible
                </li>
                <li>
                  <strong>Grace Period:</strong> A 7-day grace period is
                  provided after expiration to renew your license
                </li>
              </ul>

              <h4 className="text-lg font-medium text-foreground mt-4">
                Prohibited Activities
              </h4>
              <p>When using a self-hosted license, you may not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Share your license with other companies or organizations
                </li>
                <li>Rent, lease, or resell the software to third parties</li>
                <li>Remove or modify license validation mechanisms</li>
                <li>
                  Use the software to provide commercial services to other
                  entities
                </li>
                <li>Reverse engineer the license validation system</li>
              </ul>

              <h4 className="text-lg font-medium text-foreground mt-4">
                License Enforcement
              </h4>
              <p>We reserve the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Monitor license validation requests for compliance</li>
                <li>Investigate suspected license violations</li>
                <li>
                  Terminate licenses that are being used in violation of these
                  terms
                </li>
                <li>
                  Pursue legal action for license fraud or unauthorized
                  distribution
                </li>
              </ul>

              <h4 className="text-lg font-medium text-foreground mt-4">
                Data Collection for License Validation
              </h4>
              <p>
                For self-hosted deployments, we collect minimal data for license
                validation purposes only:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>License key</li>
                <li>Validation timestamp</li>
                <li>Software version</li>
                <li>Server count (for monitoring compliance)</li>
              </ul>
              <p className="mt-2">
                No business data, message content, or queue information is
                transmitted during license validation.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              5. Acceptable Use Policy
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                You agree to use our service only for lawful purposes and in
                accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit any harmful or malicious code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the service</li>
                <li>
                  Use the service to spam or send unsolicited communications
                </li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Share your account credentials with others</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              6. Data and Privacy
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Your privacy is important to us. Our collection and use of
                personal information is governed by our Privacy Policy, which is
                incorporated into these Terms by reference.
              </p>
              <p>
                You retain ownership of your data. By using our service, you
                grant us a limited license to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process your data to provide the service</li>
                <li>Store your data securely on our systems</li>
                <li>Create backups of your data</li>
                <li>Analyze usage patterns to improve our service</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              7. Service Availability and Support
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-xl font-medium text-foreground">
                7.1 Service Level Agreement
              </h3>
              <p>We strive to maintain high service availability:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Uptime Target:</strong> 99.9% monthly uptime
                </li>
                <li>
                  <strong>Maintenance Windows:</strong> Scheduled during
                  low-traffic periods
                </li>
                <li>
                  <strong>Emergency Maintenance:</strong> With advance notice
                  when possible
                </li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">
                7.2 Support
              </h3>
              <p>Support is provided based on your subscription plan:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Free Plan:</strong> Community support via forums
                </li>
                <li>
                  <strong>Developer Plan:</strong> Email support with 48-hour
                  response
                </li>
                <li>
                  <strong>Enterprise Plan:</strong> Priority email support with
                  24-hour response
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              8. Intellectual Property Rights
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                The service and its original content, features, and
                functionality are owned by Qarote and are protected by
                international copyright, trademark, patent, trade secret, and
                other intellectual property laws.
              </p>
              <p>You may not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Copy, modify, or distribute our software</li>
                <li>Create derivative works based on our service</li>
                <li>Use our trademarks or logos without permission</li>
                <li>Remove or alter any proprietary notices</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              9. Limitation of Liability
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                To the maximum extent permitted by law, Qarote shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, including without limitation, loss of profits,
                data, use, goodwill, or other intangible losses, resulting from
                your use of the service.
              </p>
              <p>
                Our total liability to you for all damages shall not exceed the
                amount you paid us for the service in the 12 months preceding
                the claim.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              10. Indemnification
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                You agree to defend, indemnify, and hold harmless Qarote and its
                officers, directors, employees, and agents from and against any
                claims, damages, obligations, losses, liabilities, costs, or
                debt, and expenses (including attorney's fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your use of the service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Any content you submit or transmit through the service</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              11. Termination
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-xl font-medium text-foreground">
                11.1 Termination by You
              </h3>
              <p>
                You may terminate your account at any time by canceling your
                subscription through your account settings or by contacting us.
              </p>

              <h3 className="text-xl font-medium text-foreground">
                11.2 Termination by Us
              </h3>
              <p>
                We may terminate or suspend your account immediately, without
                prior notice, for conduct that we believe violates these Terms
                or is harmful to other users, us, or third parties.
              </p>

              <h3 className="text-xl font-medium text-foreground">
                11.3 Effect of Termination
              </h3>
              <p>Upon termination:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your right to use the service will cease immediately</li>
                <li>We may delete your account and data</li>
                <li>
                  You remain liable for all amounts due up to the termination
                  date
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              12. Governing Law and Dispute Resolution
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                These Terms shall be governed by and construed in accordance
                with the laws of [Your Jurisdiction], without regard to its
                conflict of law provisions.
              </p>
              <p>
                Any disputes arising from these Terms or your use of the service
                shall be resolved through binding arbitration, except that
                either party may seek injunctive relief in court to prevent
                irreparable harm.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              13. Changes to Terms
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We reserve the right to modify these Terms at any time. We will
                notify you of any material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posting the updated Terms on our website</li>
                <li>Sending you an email notification</li>
                <li>Displaying a notice in our application</li>
              </ul>
              <p>
                Your continued use of the service after any changes constitutes
                acceptance of the updated Terms.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              14. Contact Information
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                If you have any questions about these Terms of Service, please
                contact us:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Email:</strong> support@qarote.io
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

export default TermsOfService;
