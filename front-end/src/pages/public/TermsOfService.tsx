import React from "react";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Terms of Service</h1>
            </div>
            <p className="text-gray-600">Last updated: July 15, 2025</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Terms of Service Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              By accessing or using RabbitHQ Dashboard, you agree to be bound by
              these Terms of Service. If you do not agree with any part of these
              terms, you may not use our service.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              RabbitHQ Dashboard provides a monitoring and management interface
              for RabbitMQ message brokers. Our service allows users to connect
              to their RabbitMQ servers, view queues, exchanges, and monitor
              system performance.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              To use certain features of our service, you must create an
              account. You are responsible for maintaining the confidentiality
              of your account information and for all activities that occur
              under your account.
            </p>
            <p>You agree to:</p>
            <ul>
              <li>
                Provide accurate and complete information when creating your
                account
              </li>
              <li>Maintain and promptly update your account information</li>
              <li>Protect your account credentials</li>
              <li>
                Notify us immediately of any unauthorized use of your account
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Subscription and Billing</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              RabbitHQ Dashboard offers various subscription plans. Payment for
              subscription services is due at the time of purchase. Subscription
              fees are non-refundable except as expressly provided in these
              Terms.
            </p>
            <p>
              We may change subscription fees at any time, but will provide you
              with reasonable notice before any changes in fees take effect.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Data Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Our Privacy Policy, available at{" "}
              <a
                href="/privacy-policy"
                className="text-blue-600 hover:underline"
              >
                Privacy Policy
              </a>
              , explains how we collect, use, and protect your information. By
              using our service, you agree to the terms outlined in our Privacy
              Policy.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Intellectual Property Rights</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              All content, features, and functionality of the RabbitHQ
              Dashboard, including but not limited to text, graphics, logos,
              icons, and code, are owned by RabbitHQ and are protected by
              international copyright, trademark, and other intellectual
              property laws.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              In no event shall RabbitHQ be liable for any indirect, incidental,
              special, consequential, or punitive damages, including without
              limitation, loss of profits, data, use, goodwill, or other
              intangible losses, resulting from your use or inability to use the
              service.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Termination</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              We reserve the right to terminate or suspend your account and
              access to our service immediately, without prior notice or
              liability, for any reason, including without limitation if you
              breach the Terms of Service.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              We reserve the right to modify or replace these Terms at any time.
              If a revision is material, we will provide at least 30 days'
              notice prior to any new terms taking effect. What constitutes a
              material change will be determined at our sole discretion.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>10. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:support@rabbithq.io"
                className="text-blue-600 hover:underline"
              >
                support@rabbithq.io
              </a>
              .
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} RabbitHQ. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="/" className="hover:underline">
              Home
            </a>
            <a href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
