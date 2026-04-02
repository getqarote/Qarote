import { t } from "@/lib/i18n-static";
import { teamMembers } from "@/lib/team-data";

const baseUrl = "https://qarote.io";

export function buildAboutSchema(
  translations: Record<string, unknown>
): Record<string, unknown>[] {
  return teamMembers.map((member) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    name: t(translations, `team.${member.id}.name`),
    jobTitle: t(translations, `team.${member.id}.role`),
    url: `${baseUrl}/about/`,
    image: `${baseUrl}${member.photo}`,
    sameAs: [member.linkedin],
    worksFor: { "@id": `${baseUrl}/#organization` },
    knowsAbout: member.knowsAbout,
  }));
}
