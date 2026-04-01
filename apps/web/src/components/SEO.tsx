import React, { type ComponentType } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { SUPPORTED_LOCALES } from "@qarote/i18n";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEO = ({
  title = "Qarote - Modern RabbitMQ Monitoring & Management Dashboard",
  description = "Modern RabbitMQ monitoring and management dashboard for developers. Monitor queues, track performance, and manage your message broker with a clean UI. Cleaner than Management Plugin, simpler than Prometheus.",
  image = "https://qarote.io/images/social_card.png",
  url = "https://qarote.io/",
  type = "website",
}: SEOProps) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const siteTitle = "Qarote";
  const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;

  const HelmetComponent = Helmet as unknown as ComponentType<{
    children?: React.ReactNode;
  }>;

  return (
    <HelmetComponent>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content="Qarote Team" />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />

      {/* Language */}
      <html lang={currentLang} />

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
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content={title} />
      <meta
        property="og:locale"
        content={currentLang === "en" ? "en_US" : currentLang}
      />
      <meta property="og:site_name" content="Qarote" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* BreadcrumbList Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://qarote.io/",
            },
            ...(url !== "https://qarote.io" && url !== "https://qarote.io/"
              ? [
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: title.replace(/ \| Qarote$|- Modern RabbitMQ.*$/, ""),
                    item: url,
                  },
                ]
              : []),
          ],
        })}
      </script>

      {/* Hreflang tags for all supported locales */}
      {SUPPORTED_LOCALES.map((locale) => {
        const baseUrl = url.endsWith("/") ? url : `${url}/`;
        return (
          <link
            key={locale}
            rel="alternate"
            hrefLang={locale}
            href={locale === "en" ? baseUrl : `${baseUrl}${locale}/`}
          />
        );
      })}
      <link rel="alternate" hrefLang="x-default" href={url} />
    </HelmetComponent>
  );
};

export default SEO;
