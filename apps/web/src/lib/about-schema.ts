const baseUrl = "https://qarote.io";

export function buildAboutSchema() {
  const brice = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Brice Tessier",
    jobTitle: "Co-founder & CTO",
    url: `${baseUrl}/about/`,
    image: `${baseUrl}/images/team/brice.jpg`,
    sameAs: ["https://www.linkedin.com/in/bricetessierhuort/"],
    worksFor: { "@id": `${baseUrl}/#organization` },
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
  };

  const paul = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Paul Dufour",
    jobTitle: "Co-founder & CMO",
    url: `${baseUrl}/about/`,
    image: `${baseUrl}/images/team/paul.jpg`,
    sameAs: ["https://www.linkedin.com/in/paul-dufour/"],
    worksFor: { "@id": `${baseUrl}/#organization` },
    knowsAbout: [
      "Digital Marketing",
      "E-commerce",
      "Growth Strategy",
      "Google Ads",
      "SEO",
    ],
  };

  return [brice, paul];
}
