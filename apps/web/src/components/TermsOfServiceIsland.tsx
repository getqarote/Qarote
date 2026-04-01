import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function TermsOfServiceIsland() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
            Last updated: January 15, 2026
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              1. Acceptance of Terms
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                By accessing and using Qarote (&quot;the Service&quot;), you
                accept and agree to be bound by the terms and provision of this
                agreement. If you do not agree to abide by the above, please do
                not use this service.
              </p>
              <p>
                These Terms of Service (&quot;Terms&quot;) govern your use of
                our RabbitMQ monitoring and management platform operated by
                Qarote (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;).
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
              <p>
                We offer multiple subscription plans. Subscription fees are
                billed in advance on a monthly or annual basis. You may cancel
                your subscription at any time.
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
                accordance with these Terms.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              6. Data and Privacy
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Your privacy is important to us. Our collection and use of
                personal information is governed by our Privacy Policy.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              7. Limitation of Liability
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                To the maximum extent permitted by law, Qarote shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              8. Contact Information
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Email:</strong> support@qarote.io
                </li>
                <li>
                  <strong>Address:</strong> 229 rue Saint-Honor&eacute;, 75001,
                  Paris, France
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
