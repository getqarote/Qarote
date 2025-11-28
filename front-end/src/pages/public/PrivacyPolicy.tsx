import React from "react";
import { useNavigate } from "react-router-dom";

import { ArrowLeft, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
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

        {/* Introduction */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              At RabbitHQ Dashboard, we take your privacy seriously. This
              Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our service.
            </p>
            <p>
              Please read this privacy policy carefully. If you disagree with
              its terms, please discontinue use of our service immediately.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <h3>Personal Data</h3>
            <p>When you register for an account, we collect:</p>
            <ul>
              <li>Name and contact information (email address)</li>
              <li>Account credentials</li>
              <li>
                Payment information (processed securely through our payment
                processor)
              </li>
              <li>Usage data and preferences</li>
            </ul>

            <h3>RabbitMQ Server Data</h3>
            <p>When you connect to your RabbitMQ servers, we may collect:</p>
            <ul>
              <li>Server connection details (host, port, credentials)</li>
              <li>Queue, exchange, and message data</li>
              <li>Server performance metrics</li>
            </ul>
            <p>
              By default, we operate in live mode with no persistent data
              storage. However, based on your selected retention settings, we
              may store message data temporarily.
            </p>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>
                Send administrative notifications, such as security alerts
              </li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends and usage</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Storage and Security */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Data Storage and Security</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information:
            </p>
            <ul>
              <li>
                All stored data is encrypted using AES-256 encryption, both at
                rest and in transit
              </li>
              <li>
                Data is automatically deleted after your specified retention
                period expires
              </li>
              <li>
                We never share your RabbitMQ data with third parties or use it
                for analytics
              </li>
              <li>
                By default, we operate in live mode with no persistent data
                storage
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to processing of your personal information</li>
              <li>
                Request restriction of processing of your personal information
              </li>
              <li>Request transfer of your personal information</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </CardContent>
        </Card>

        {/* Cookies and Tracking */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cookies and Tracking Technologies</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              We use cookies and similar tracking technologies to track activity
              on our service and hold certain information. Cookies are files
              with a small amount of data that may include an anonymous unique
              identifier.
            </p>
            <p>
              You can instruct your browser to refuse all cookies or to indicate
              when a cookie is being sent. However, if you do not accept
              cookies, you may not be able to use some portions of our service.
            </p>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Our service may contain links to third-party websites or services
              that are not owned or controlled by RabbitHQ Dashboard. We have no
              control over and assume no responsibility for the content, privacy
              policies, or practices of any third-party websites or services.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Privacy Policy */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              We may update our Privacy Policy from time to time. We will notify
              you of any changes by posting the new Privacy Policy on this page
              and updating the "Last updated" date.
            </p>
            <p>
              You are advised to review this Privacy Policy periodically for any
              changes. Changes to this Privacy Policy are effective when they
              are posted on this page.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">
                  Questions about Privacy?
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  If you have any questions about our privacy practices or need
                  help with your data settings, please contact our privacy team
                  at{" "}
                  <a href="mailto:support@rabbithq.io" className="underline">
                    support@rabbithq.io
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} RabbitHQ. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="/" className="hover:underline">
              Home
            </a>
            <a href="/terms-of-service" className="hover:underline">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
