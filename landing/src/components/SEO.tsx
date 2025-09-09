import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string[];
  faq?: FAQItem[];
  structuredData?: Record<string, unknown>;
}

interface FAQItem {
  question: string;
  answer: string;
}

export const SEO = ({
  title = "RabbitHQ - Best RabbitMQ Monitoring & Management Interface",
  description = "The best RabbitMQ monitoring and management interface for developers. Monitor queues, track performance, and manage your message broker with a modern dashboard. Cleaner than Management Plugin, simpler than Prometheus.",
  image = "https://rabbithq.io/social-card.png",
  url = "https://rabbithq.io",
  type = "website",
  keywords = [
    "RabbitMQ",
    "RabbitMQ monitoring",
    "RabbitMQ management",
    "RabbitMQ web interface",
    "RabbitMQ dashboard",
    "RabbitMQ admin",
    "RabbitMQ GUI",
    "RabbitMQ UI",
    "RabbitMQ interface",
    "RabbitMQ monitoring tool",
    "RabbitMQ management tool",
    "RabbitMQ queue management",
    "RabbitMQ management UI",
    "RabbitMQ monitoring UI",
    "RabbitMQ admin GUI",
    "RabbitMQ management interface",
    "Message Broker",
    "Queue Management",
  ],
  faq,
  structuredData,
}: SEOProps) => {
  const siteTitle = "RabbitHQ";
  const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;

  // Generate FAQ schema if FAQs are provided
  const faqSchema = faq
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />
      <meta name="author" content="RabbitHQ Team" />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />

      {/* Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#4f46e5" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="RabbitHQ" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@RabbitMQGUINext" />
      <meta name="twitter:creator" content="@RabbitMQGUINext" />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Structured Data - FAQ */}
      {faq && (
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      )}

      {/* Custom Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
