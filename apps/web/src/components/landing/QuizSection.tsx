const TIERS = [
  { label: "Reactive", bg: "bg-red-100", text: "text-red-800" },
  { label: "Proactive", bg: "bg-amber-100", text: "text-amber-800" },
  { label: "Production-Grade", bg: "bg-emerald-100", text: "text-emerald-800" },
];

const QuizSection = () => {
  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-border overflow-hidden">
          <div className="px-6 py-3 bg-muted/40 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Free · 20 questions · ~5 minutes
            </span>
          </div>
          <div className="px-8 py-12 lg:px-16 lg:py-14">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 leading-[1.2] font-normal text-foreground">
                  How well do you know your RabbitMQ setup?
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  20 questions across queues, exchanges, consumers, and
                  production patterns. Get a score, a tier verdict, and see
                  exactly where your gaps are.
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIERS.map((tier) => (
                    <span
                      key={tier.label}
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${tier.bg} ${tier.text}`}
                    >
                      {tier.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-start md:items-center gap-4">
                <a
                  href="/quiz/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
                >
                  Take the free assessment
                  <img
                    src="/images/arrow-right.svg"
                    alt=""
                    aria-hidden="true"
                    width={13}
                    height={13}
                    className="h-[0.8em] w-auto align-middle image-crisp brightness-0 invert"
                  />
                </a>
                <p className="text-sm text-muted-foreground">
                  No sign-up required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuizSection;
