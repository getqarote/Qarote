import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * "How it works" — three steps to value in under two minutes, anchored by the
 * real .mcp.json artifact. Ported from Qarote.html (#how).
 *
 * Light section (theme tokens) for the steps; the code card is a fixed dark
 * panel (hardcoded hero colors, like SelfHostedSection / the hero), since the
 * .mcp.json block reads as an editor artifact regardless of theme.
 *
 * The .mcp.json content is an English literal (it is code, not prose) — only
 * the section chrome and the copy-button labels are i18n'd.
 */

const STEPS = ["step1", "step2", "step3"] as const;

/**
 * The .mcp.json config, tokenized for light syntax coloring. Kept as a literal
 * artifact — the `•` bullets in the API key are intentional and preserved. The
 * trailing comments document the self-hosted base-URL override.
 */
type Tok = "key" | "str" | "punc" | "com" | "plain";

const MCP_JSON: { text: string; tok: Tok }[][] = [
  [{ text: "{", tok: "punc" }],
  [
    { text: "  ", tok: "plain" },
    { text: '"mcpServers"', tok: "key" },
    { text: ": {", tok: "punc" },
  ],
  [
    { text: "    ", tok: "plain" },
    { text: '"qarote"', tok: "key" },
    { text: ": {", tok: "punc" },
  ],
  [
    { text: "      ", tok: "plain" },
    { text: '"command"', tok: "key" },
    { text: ": ", tok: "punc" },
    { text: '"npx"', tok: "str" },
    { text: ",", tok: "punc" },
  ],
  [
    { text: "      ", tok: "plain" },
    { text: '"args"', tok: "key" },
    { text: ": [", tok: "punc" },
    { text: '"-y"', tok: "str" },
    { text: ", ", tok: "punc" },
    { text: '"@qarote/mcp"', tok: "str" },
    { text: "],", tok: "punc" },
  ],
  [
    { text: "      ", tok: "plain" },
    { text: '"env"', tok: "key" },
    { text: ": {", tok: "punc" },
  ],
  [
    { text: "        ", tok: "plain" },
    { text: '"QAROTE_API_KEY"', tok: "key" },
    { text: ": ", tok: "punc" },
    { text: '"qa_live_••••••••"', tok: "str" },
  ],
  [
    { text: "      ", tok: "plain" },
    { text: "}", tok: "punc" },
  ],
  [
    { text: "    ", tok: "plain" },
    { text: "}", tok: "punc" },
  ],
  [
    { text: "  ", tok: "plain" },
    { text: "}", tok: "punc" },
  ],
  [{ text: "}", tok: "punc" }],
  [{ text: "", tok: "plain" }],
  [{ text: "# self-hosted? point at your own URL", tok: "com" }],
  [{ text: "# QAROTE_BASE_URL=https://qarote.internal", tok: "com" }],
];

// Plain-text form used for the clipboard copy (no markup, just the artifact).
const MCP_JSON_TEXT = MCP_JSON.map((line) =>
  line.map((s) => s.text).join("")
).join("\n");

const TOK_CLASS: Record<Tok, string> = {
  key: "text-[#7fb3ff]",
  str: "text-[#f0a868]",
  punc: "text-[#E7EAF0]",
  com: "italic text-[#5b6675]",
  plain: "text-[#E7EAF0]",
};

const CopyButton = () => {
  const { t } = useTranslation("landing");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_JSON_TEXT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (insecure context / denied) — fail silently;
      // the config is fully visible to select manually.
    }
  };

  const label = copied ? t("howItWorks.copied") : t("howItWorks.copy");

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className="rounded-[6px] border border-[#232936] bg-[#11151E] px-[10px] py-[5px] font-mono text-[11.5px] text-[#9AA3B2] transition-colors hover:border-[#2b3140] hover:text-[#E7EAF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A6DF0]"
    >
      {label}
    </button>
  );
};

const HowItWorksSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section id="how" className="py-[clamp(64px,9vw,128px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)]">
        <div className="max-w-[660px]">
          <span className="font-mono text-[12.5px] uppercase tracking-[0.13em] text-primary">
            {t("howItWorks.eyebrow")}
          </span>
          <h2 className="mt-[18px] font-display text-[clamp(30px,4.4vw,46px)] font-semibold tracking-[-0.025em] text-foreground">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-[18px] max-w-[58ch] text-[clamp(17px,1.6vw,19px)] leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <div className="mt-[clamp(32px,5vw,48px)] grid items-start gap-[clamp(28px,5vw,56px)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* Steps */}
          <div className="flex flex-col gap-[30px]">
            {STEPS.map((step) => (
              <div key={step} className="border-t-2 border-foreground pt-7">
                <span className="font-mono text-[13px] font-semibold text-primary">
                  {t(`howItWorks.${step}.label`)}
                </span>
                <h3 className="mb-[10px] mt-[14px] font-display text-[22px] font-semibold text-foreground">
                  {t(`howItWorks.${step}.title`)}
                </h3>
                <p className="text-[15.5px] leading-[1.5] text-muted-foreground">
                  {t(`howItWorks.${step}.desc`)}
                </p>
                <div className="mt-[14px] font-mono text-[12.5px] text-muted-foreground/70">
                  {t(`howItWorks.${step}.timing`)}
                </div>
              </div>
            ))}
          </div>

          {/* .mcp.json code card */}
          <div className="overflow-hidden rounded-xl border border-[#232936] bg-[#0B0E14] lg:sticky lg:top-[90px]">
            <div className="flex items-center gap-[7px] border-b border-[#232936] bg-[#11151E] px-4 py-[11px]">
              <span
                className="h-[10px] w-[10px] rounded-full bg-[#2b3140]"
                aria-hidden="true"
              />
              <span
                className="h-[10px] w-[10px] rounded-full bg-[#2b3140]"
                aria-hidden="true"
              />
              <span
                className="h-[10px] w-[10px] rounded-full bg-[#2b3140]"
                aria-hidden="true"
              />
              <span className="ml-[6px] font-mono text-[12.5px] text-[#9AA3B2]">
                .mcp.json
              </span>
              <span className="ml-auto">
                <CopyButton />
              </span>
            </div>
            <pre className="overflow-x-auto px-5 py-[18px] font-mono text-[13.5px] leading-[1.7] text-[#E7EAF0]">
              <code>
                {MCP_JSON.map((line, i) => (
                  <span key={i} className="block min-h-[1.7em]">
                    {line.map((seg, j) => (
                      <span key={j} className={TOK_CLASS[seg.tok]}>
                        {seg.text}
                      </span>
                    ))}
                  </span>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
