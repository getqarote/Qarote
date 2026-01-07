import * as React from "react";

import type { LucideProps } from "lucide-react";
import { LucideIcon, Activity, Shield, MessageSquare, BarChart3, Settings, Rocket } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  // Type-safe workaround for React type conflicts between lucide-react and @types/react
  const IconComponent = Icon as unknown as React.ComponentType<LucideProps>;
  
  // Check if this is the Activity icon and use the real-time SVG instead
  // Compare by checking the displayName, function name, or title
  const isActivityIcon = Icon === Activity || 
    (Icon as any)?.displayName === 'Activity' || 
    (Icon as any)?.name === 'Activity' ||
    title === "Live Queue Monitoring";

  // Check if this is the Shield icon and use the flag SVG instead
  const isShieldIcon = Icon === Shield || 
    (Icon as any)?.displayName === 'Shield' || 
    (Icon as any)?.name === 'Shield' ||
    title === "Smart Alerting System";

  // Check if this is the MessageSquare icon and use the message SVG instead
  const isMessageSquareIcon = Icon === MessageSquare || 
    (Icon as any)?.displayName === 'MessageSquare' || 
    (Icon as any)?.name === 'MessageSquare' ||
    title === "Queue Management";

  // Check if this is the BarChart3 icon and use the chart SVG instead
  const isBarChart3Icon = Icon === BarChart3 || 
    (Icon as any)?.displayName === 'BarChart3' || 
    (Icon as any)?.name === 'BarChart3' ||
    title === "Performance Analytics";

  // Check if this is the Settings icon and use the server SVG instead
  const isSettingsIcon = Icon === Settings || 
    (Icon as any)?.displayName === 'Settings' || 
    (Icon as any)?.name === 'Settings' ||
    title === "Multi-Server Support";

  // Check if this is the Rocket icon and use the send SVG instead
  const isRocketIcon = Icon === Rocket || 
    (Icon as any)?.displayName === 'Rocket' || 
    (Icon as any)?.name === 'Rocket' ||
    title === "Message Publishing";

  return (
    <div className="group relative p-6 bg-transparent border border-border transition-all duration-300 hover:-translate-y-1">
      <div className="inline-flex p-3 bg-orange-100 mb-4">
        {isActivityIcon ? (
          <img
            src="/images/real-time.svg"
            alt="Real-time"
            className="h-6 w-6"
            style={{ imageRendering: "crisp-edges" }}
          />
        ) : isShieldIcon ? (
          <img
            src="/images/flag.svg"
            alt="Flag"
            className="h-6 w-6"
            style={{ imageRendering: "crisp-edges" }}
          />
        ) : isMessageSquareIcon ? (
          <img
            src="/images/message.svg"
            alt="Message"
            className="h-6 w-6"
            style={{ imageRendering: "crisp-edges" }}
          />
        ) : isBarChart3Icon ? (
          <img
            src="/images/chart.svg"
            alt="Chart"
            className="h-6 w-6"
            style={{ imageRendering: "crisp-edges" }}
          />
        ) : isSettingsIcon ? (
          <img
            src="/images/server.svg"
            alt="Server"
            className="h-6 w-6"
            style={{ imageRendering: "crisp-edges" }}
          />
        ) : isRocketIcon ? (
          <img
            src="/images/send.svg"
            alt="Send"
            className="h-6 w-6"
            style={{ imageRendering: "crisp-edges" }}
          />
        ) : (
          <IconComponent className="h-6 w-6" style={{ color: "#FF691B" }} />
        )}
      </div>
      <h3 className="text-2xl text-foreground mb-2" style={{ fontWeight: 400 }}>
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
