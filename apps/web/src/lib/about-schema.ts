import { t } from "@/lib/i18n-static";
import { teamMembers } from "@/lib/team-data";

const baseUrl = "https://qarote.io";

export function buildAboutSchema(
  translations: Record<string, unknown>
): Record<string, unknown>[] {
  return teamMembers.map((member) => {
    const name = t(translations, `team.${member.id}.name`);
    const jobTitle = t(translations, `team.${member.id}.role`);

    if (!name || name.includes("team.")) {
      throw new Error(
        `Missing i18n key "team.${member.id}.name" in about translations`
      );
    }
    if (!jobTitle || jobTitle.includes("team.")) {
      throw new Error(
        `Missing i18n key "team.${member.id}.role" in about translations`
      );
    }

    return {
      "@context": "https://schema.org",
      "@type": "Person",
      name,
      jobTitle,
      url: `${baseUrl}/about/`,
      image: `${baseUrl}${member.photo}`,
      sameAs: [member.linkedin],
      worksFor: { "@id": `${baseUrl}/#organization` },
      knowsAbout: member.knowsAbout,
    };
  });
}
