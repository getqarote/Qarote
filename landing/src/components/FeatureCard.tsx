import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: FeatureCardProps) => {
  return (
    <div className="group relative p-6 bg-transparent border border-border rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-soft">
      <div className="inline-flex p-3 rounded-lg bg-orange-100 mb-4">
        <Icon className="h-6 w-6 text-orange-600" />
      </div>
      <h3 className="text-xl font-semibold text-card-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
