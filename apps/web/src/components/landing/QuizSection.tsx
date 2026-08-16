const TIERS = ["Reactive", "Proactive", "Production-Grade"];

const QuizSection = () => {
  return (
    <section id="quiz" className="py-[clamp(48px,6vw,88px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)]">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-carrot to-[#C9490A] p-[clamp(40px,6vw,72px)] text-center text-white after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(80%_120%_at_100%_0%,rgba(255,255,255,0.14),transparent_55%)] after:content-['']">
          <span className="relative inline-flex items-center gap-[10px] font-mono text-[12.5px] uppercase tracking-[0.13em] text-white/90 before:inline-block before:h-px before:w-[18px] before:bg-white/70 before:content-['']">
            Free · 20 questions · ~5 minutes
          </span>
          <h2 className="relative mt-[18px] font-display text-[clamp(28px,4vw,42px)] font-semibold tracking-[-0.025em]">
            How well do you know your RabbitMQ setup?
          </h2>
          <p className="relative mx-auto mt-4 max-w-[56ch] text-[17px] leading-relaxed text-white/90 [text-wrap:pretty]">
            20 questions across queues, exchanges, consumers, and production
            patterns. Get a score, a tier verdict, and see exactly where your
            gaps are.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-[10px]">
            {TIERS.map((tier) => (
              <span
                key={tier}
                className="rounded-full border border-white/25 bg-white/[0.16] px-[15px] py-[7px] font-mono text-[13px]"
              >
                {tier}
              </span>
            ))}
          </div>
          <div className="relative mt-[30px]">
            <a
              href="/quiz/"
              className="group inline-flex items-center gap-2 rounded-[7px] bg-white px-6 py-[14px] font-medium text-[#C9490A] transition-colors hover:bg-[#FBFAF8]"
            >
              Take the free assessment
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </a>
          </div>
          <div className="relative mt-[14px] font-mono text-[12.5px] text-white/85">
            No sign-up required.
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuizSection;
