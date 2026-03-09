import * as React from "react";

import type { LucideProps } from "lucide-react";
import {
  Activity,
  BarChart3,
  LucideIcon,
  MessageSquare,
  Rocket,
  Settings,
  Shield,
} from "lucide-react";

const iconImageMap: Record<string, { src: string; alt: string }> = {
  Activity: { src: "/images/real-time.svg", alt: "Real-time" },
  Shield: { src: "/images/flag.svg", alt: "Flag" },
  MessageSquare: { src: "/images/message.svg", alt: "Message" },
  BarChart3: { src: "/images/chart.svg", alt: "Chart" },
  Settings: { src: "/images/server.svg", alt: "Server" },
  Rocket: { src: "/images/send.svg", alt: "Send" },
};

const iconComponents = {
  Activity,
  Shield,
  MessageSquare,
  BarChart3,
  Settings,
  Rocket,
};

function getIconKey(Icon: LucideIcon, title: string): string | undefined {
  for (const [key, component] of Object.entries(iconComponents)) {
    if (
      Icon === component ||
      (Icon as unknown as Record<string, string>)?.displayName === key ||
      (Icon as unknown as Record<string, string>)?.name === key
    ) {
      return key;
    }
  }
  // Fallback: match by title
  const titleMap: Record<string, string> = {
    "live queue monitoring": "Activity",
    "smart alerting system": "Shield",
    "queue management": "MessageSquare",
    "performance analytics": "BarChart3",
    "multi-server support": "Settings",
    "message publishing": "Rocket",
  };
  return titleMap[title.toLowerCase()];
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  const IconComponent = Icon as unknown as React.ComponentType<LucideProps>;
  const iconKey = getIconKey(Icon, title);
  const imageSrc = iconKey ? iconImageMap[iconKey] : null;

  return (
    <div className="group relative p-6 bg-transparent border border-border transition-all duration-300 hover:-translate-y-1">
      <div className="inline-flex p-3 bg-orange-100 mb-4">
        {imageSrc ? (
          <img
            src={imageSrc.src}
            alt=""
            aria-hidden="true"
            className="h-6 w-6 image-crisp"
          />
        ) : (
          <IconComponent className="h-6 w-6 text-primary" />
        )}
      </div>
      <h3 className="text-2xl text-foreground mb-2 font-normal">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
