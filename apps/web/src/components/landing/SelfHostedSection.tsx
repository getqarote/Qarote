import { useTranslation } from "react-i18next";

/**
 * "Self-hosted & data control" — a dark band that speaks to the data-sovereign
 * engineer: offline JWT license, local Ollama model, MIT core. Ported from
 * Qarote.html (#self-hosted). Fixed near-black panel → hardcoded hero colors,
 * not theme tokens (matches the hero). Deploy targets are product names (literal).
 */

const CARDS = [
  { key: "offline" },
  { key: "localAi" },
  { key: "mitCore" },
] as const;

const DEPLOY = [
  "Docker",
  "Docker Compose",
  "Dokku",
  "Standalone binary",
  "CloudAMQP",
  "Amazon MQ",
];

const SelfHostedSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section
      id="self-hosted"
      className="bg-[#0B0E14] py-[clamp(64px,9vw,128px)] text-[#E7EAF0]"
    >
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)]">
        <div className="max-w-[660px]">
          <span className="font-mono text-[12.5px] uppercase tracking-[0.13em] text-carrot">
            {t("selfHosted.eyebrow")}
          </span>
          <h2 className="mt-[18px] font-display text-[clamp(30px,4.4vw,46px)] font-semibold tracking-[-0.025em] text-white">
            {t("selfHosted.title")}
          </h2>
          <p className="mt-[18px] max-w-[58ch] text-[clamp(17px,1.6vw,19px)] leading-relaxed text-[#9AA3B2] [text-wrap:pretty]">
            {t("selfHosted.subtitle")}
          </p>
        </div>

        <div className="mt-[clamp(32px,5vw,48px)] grid gap-[18px] md:grid-cols-3">
          {CARDS.map(({ key }) => (
            <div
              key={key}
              className="rounded-xl border border-[#232936] bg-[#11151E] p-6"
            >
              <span className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-carrot">
                {t(`selfHosted.${key}.label`)}
              </span>
              <h3 className="mb-[10px] mt-[10px] font-display text-[18px] font-semibold text-white">
                {t(`selfHosted.${key}.title`)}
              </h3>
              <p className="text-[14.5px] leading-[1.5] text-[#9AA3B2]">
                {t(`selfHosted.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-[10px]">
          {DEPLOY.map((d) => (
            <span
              key={d}
              className="rounded-full border border-[#232936] px-[13px] py-[7px] font-mono text-[12.5px] text-[#9AA3B2]"
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SelfHostedSection;
