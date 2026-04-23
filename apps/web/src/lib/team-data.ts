interface TeamMember {
  /** Used as i18n key prefix: t(`team.${id}.name`) */
  id: string;
  photo: string;
  linkedin: string;
  /** For JSON-LD Person schema only */
  knowsAbout: string[];
}

export const teamMembers: TeamMember[] = [
  {
    id: "brice",
    photo: "/images/team/brice.jpg",
    linkedin: "https://www.linkedin.com/in/bricetessierhuort/",
    knowsAbout: [
      "RabbitMQ",
      "Distributed Systems",
      "Node.js",
      "TypeScript",
      "React",
      "Kafka",
      "PostgreSQL",
      "Docker",
    ],
  },
  {
    id: "paul",
    photo: "/images/team/paul.jpg",
    linkedin: "https://www.linkedin.com/in/paul-dufour/",
    knowsAbout: [
      "Digital Marketing",
      "E-commerce",
      "Growth Strategy",
      "Google Ads",
      "SEO",
    ],
  },
];
