import type { SupportedLocale } from "@qarote/i18n";
import { ArrowLeft, Linkedin } from "lucide-react";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { Button } from "@/components/ui/button";

interface AboutIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function AboutIsland({
  locale = "en",
  resources,
}: AboutIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-white">
        <StickyNav />
        <AboutContent />
        <FooterSection currentLocale={locale} />
      </div>
    </IslandProvider>
  );
}

const teamMembers = [
  {
    name: "Brice Tessier",
    role: "Co-founder & CTO",
    photo: "/images/team/brice.jpg",
    linkedin: "https://www.linkedin.com/in/bricetessierhuort/",
    location: "Paris, France",
    bio: "Full-stack engineer specializing in distributed systems, from design to cloud deployment. Built Qarote from a personal pain point — after years working with RabbitMQ in production at scale, existing monitoring tools never quite cut it.",
    highlights: [
      "Previously at Hermes, building microservices for e-commerce with Kafka and PostgreSQL",
      "Lead Back-End Developer at IFT, architecting distributed systems with RabbitMQ and MariaDB",
      "Back-end engineer on the Bonjour RATP mobile app serving millions of daily commuters",
      "Deep expertise in React, Node.js/TypeScript, RabbitMQ, Kafka, Docker, and AWS",
    ],
  },
  {
    name: "Paul Dufour",
    role: "Co-founder & CMO",
    photo: "/images/team/paul.jpg",
    linkedin: "https://www.linkedin.com/in/paul-dufour/",
    location: "Marseille, France",
    bio: "Marketing and growth leader with a track record of scaling brands from zero to millions in revenue. Brings deep e-commerce expertise and a data-driven approach to making Qarote the go-to RabbitMQ dashboard.",
    highlights: [
      "Head of Marketing at Baltic Watches — managed 1.5M EUR annual ad budget, built headless Shopify + Storyblok stack",
      "Founded Toi Toi Mon Toit, a rooftop rental platform running for 11+ years",
      "Head of Digital & E-commerce at Les Raffineurs — grew CRM to 200k+ contacts",
      "Certified in Google Ads, Google Analytics, Klaviyo, and Brevo",
    ],
  },
];

function AboutContent() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <section className="mb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
          Built by engineers who lived the problem
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Qarote was born from years of frustration with RabbitMQ monitoring
          tools that were either too complex to set up or too limited to be
          useful. We built the dashboard we always wanted.
        </p>
      </section>

      <section className="space-y-16">
        {teamMembers.map((member) => (
          <article
            key={member.name}
            className="flex flex-col sm:flex-row gap-8 items-start"
          >
            <div className="shrink-0">
              <img
                src={member.photo}
                alt={`${member.name}, ${member.role} at Qarote`}
                width={180}
                height={180}
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-foreground">
                  {member.name}
                </h2>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={`${member.name} on LinkedIn`}
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
              <p className="text-sm font-medium text-primary mb-1">
                {member.role}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {member.location}
              </p>
              <p className="text-muted-foreground mb-4">{member.bio}</p>
              <ul className="space-y-2">
                {member.highlights.map((highlight, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-20 text-center border-t border-border pt-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">Our mission</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          RabbitMQ powers critical infrastructure for thousands of companies,
          yet monitoring it has always been harder than it should be. Qarote
          gives every team — from solo developers to enterprise ops — a clean,
          modern dashboard that just works. No Prometheus stack required.
        </p>
      </section>
    </main>
  );
}
