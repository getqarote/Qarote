import * as React from "react";

import type { LucideProps } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  // Type-safe workaround for React type conflicts between lucide-react and @types/react
  const IconComponent = Icon as unknown as React.ComponentType<LucideProps>;

  return (
    <div className="group relative p-6 bg-transparent border border-border rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-soft">
      <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-4">
        <IconComponent className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-card-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
