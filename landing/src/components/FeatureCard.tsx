import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  gradient,
}: FeatureCardProps) => {
  return (
    <div className="group relative p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div
        className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${gradient} mb-4`}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-card-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
