# Product Marketing Context — Qarote

*Last updated: 2026-04-28*

---

## Product Overview

**One-liner:** RabbitMQ monitoring that replaces the management plugin — without the Prometheus + Grafana setup.

**What it does:** Qarote is a purpose-built monitoring and management dashboard for RabbitMQ. It gives engineers a single interface to monitor queue depths, message rates, consumer counts, and server health in real time — across multiple servers and environments. Core monitoring is free forever (MIT). Premium features (alerting, multi-server workspaces, team collaboration, integrations) are unlocked via subscription.

**Product category:** RabbitMQ monitoring / message broker observability

**Product type:** SaaS (cloud-hosted) + self-hosted (Community Edition open-source, Enterprise licensed)

**Business model:**
- Community (free): core monitoring, 1 server, 1 workspace, 1 user — MIT open-source, self-hostable
- Developer ($29/mo cloud, $348/yr self-hosted): up to 3 servers, 3 workspaces, 3 team members, alerting, webhooks, topology visualization
- Enterprise ($99/mo cloud, $1,188/yr self-hosted): unlimited servers/workspaces/members, SSO/SAML/OIDC, role-based access, priority support

---

## Target Audience

**Target companies:** Engineering teams of 2–100 people running RabbitMQ in production. Startup to mid-market. Industries: e-commerce, fintech, logistics, SaaS — any company where message queues are core infrastructure.

**Decision-makers:**
- **User/Champion:** Backend engineers, DevOps engineers, SREs who interact with RabbitMQ daily
- **Decision maker:** Engineering lead or CTO at smaller companies; DevOps/Platform lead at larger ones
- **Budget:** Usually engineering budget; $29–99/mo is self-serve (no approval needed)

**Primary use case:** Monitoring RabbitMQ queue health in production — queue depths, message rates, consumer counts — without the overhead of building a custom Prometheus + Grafana stack.

**Jobs to be done:**
1. "Know immediately when queues are backing up before users are affected"
2. "Debug production message issues without writing throwaway consumer scripts"
3. "Have one place to manage and monitor all our RabbitMQ servers across environments"

**Use cases:**
- Production monitoring: catch queue backlogs before they become incidents
- Post-incident review: understand what happened to queues during an outage
- Development: publish and inspect messages without CLI tools
- Team visibility: share a single monitoring view across backend and DevOps teams

---

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Backend Engineer | Debugging message flow, fast feedback loops | No easy way to inspect queue contents or message payloads without writing consumers | Real-time queue visibility + message inspection without touching consumers |
| DevOps / SRE | System reliability, alerting, reducing MTTR | RabbitMQ management plugin is too basic; Prometheus setup is too heavy | Production-grade monitoring without infra overhead |
| Engineering Lead | Team productivity, tool consolidation | Multiple engineers checking the same RabbitMQ UI in different ways | Single shared dashboard with team access + alerting |

---

## Problems & Pain Points

**Core problem:** RabbitMQ ships with a management plugin that shows current state only — no alerting, no history, no team access, no integration with the rest of your tooling. The alternative (Prometheus + Grafana) requires significant setup and maintenance that most teams don't have the capacity for.

**Why current alternatives fall short:**
- **RabbitMQ Management Plugin:** Read-only current state. No alerts, no history, no team accounts, no API for querying metrics. Resets on restart. No mobile.
- **Prometheus + Grafana:** Powerful but requires running the rabbitmq_prometheus plugin, a Prometheus server, and Grafana — three systems to maintain. Overkill for most teams. Takes days to set up properly.
- **Datadog / New Relic:** Expensive. Generic observability tools not purpose-built for RabbitMQ. Require agent installation. Overkill and overpriced for teams that only need RabbitMQ visibility.
- **Nothing (logs only):** Teams rely on application logs + manual checking. Misses slow-moving problems. No proactive alerting.

**What it costs them:**
- Time: engineers spend 20–45 min in manual post-incident reconstruction with no metric history
- Incidents: queue backlogs discovered by users, not by the team
- Cognitive load: every engineer has their own workflow for checking RabbitMQ — no single source of truth

**Emotional tension:** Fear of missing a silent queue backup that turns into a production incident. Frustration with tooling that feels patched together. Anxiety about on-call shifts where RabbitMQ is a blind spot.

---

## Competitive Landscape

**Direct (same problem, purpose-built for RabbitMQ):**
- RabbitMQ Management Plugin — free/built-in, falls short because: no alerts, no history, no team access, resets on restart
- CloudAMQP Manager — cloud-only, tied to their hosting, not usable with self-hosted RabbitMQ

**Secondary (different solution, same problem):**
- Prometheus + Grafana — falls short because: complex to set up and maintain, not purpose-built, requires 3 systems
- Datadog RabbitMQ integration — falls short because: expensive, generic, requires agent, not RabbitMQ-native

**Indirect (competing approach):**
- "We'll just write our own dashboards" — falls short because: maintenance burden, no team access, not reusable

---

## Differentiation

**Key differentiators:**
- Built exclusively for RabbitMQ — not a generic observability tool with a RabbitMQ plugin
- Works with any RabbitMQ (self-hosted, cloud, any version 3.x and 4.x)
- Core monitoring is free forever (MIT) — no trial, no credit card, no expiration
- Self-hostable with complete data control — appeals to security-conscious teams
- Real-time live updates — sub-1-second refresh rate
- One setup, all environments — connect dev, staging, and prod servers in one dashboard

**How we do it differently:** Qarote connects directly to the RabbitMQ HTTP management API — no agent to deploy, no additional infrastructure. It's a thin layer on top of what RabbitMQ already exposes, with a usable interface, team features, and alerting on top.

**Why that's better:** Zero maintenance overhead. No Prometheus server. No Grafana. Works in 5 minutes. No lock-in — the underlying data is yours via the standard RabbitMQ API.

**Why customers choose us over alternatives:**
- Over management plugin: alerts, history (Queue History), team accounts, topology view
- Over Prometheus + Grafana: setup takes minutes not days, purpose-built UI, lower maintenance
- Over Datadog: 10x cheaper, purpose-built for RabbitMQ, self-hostable, no agent

---

## Objections

| Objection | Response |
|-----------|----------|
| "We already use the management plugin" | The plugin shows you current state. Qarote adds alerts (so you don't have to check), team access, metric history, and topology visualization. You keep using RabbitMQ — Qarote sits on top. |
| "We have Prometheus + Grafana" | If it's set up and working, keep it. Qarote is for teams who don't want to maintain a metrics pipeline to answer one question about a queue. |
| "Is it secure? We can't send RabbitMQ data to a third party" | Self-host the Community Edition — MIT license, all data stays in your infrastructure. Enterprise self-hosted adds team features on top. |
| "We only have one RabbitMQ server, do we need this?" | Community plan is free forever. Connect one server, monitor it properly, set up alerts — no cost, no commitment. |
| "How is this different from Datadog?" | Datadog is a general-purpose APM. Qarote is a purpose-built RabbitMQ dashboard. 10x cheaper, purpose-built UI, works without an agent, self-hostable. |

**Anti-persona:**
- Teams that already have Prometheus + Grafana fully set up and are happy with it
- Teams using managed RabbitMQ (CloudAMQP, Amazon MQ) where they don't control the broker
- Companies that need full distributed tracing across their entire stack (APM tool is a better fit)

---

## Switching Dynamics

**Push (frustrations driving them away from current solution):**
- Getting paged because a queue backed up and nobody noticed for 30 minutes
- Having to manually check the management plugin every morning
- Post-incident reviews where nobody knows what the queues looked like during the incident
- New engineers spending 30 minutes figuring out how to read the management plugin UI

**Pull (what attracts them to Qarote):**
- Alerts that fire before users are affected
- One dashboard for all environments (dev, staging, prod)
- Free to start — no sales call, no credit card
- Self-hostable for data-sensitive teams

**Habit (what keeps them stuck with current approach):**
- "The management plugin is good enough" (until an incident proves it isn't)
- Prometheus + Grafana is already set up — switching cost feels high
- The team is used to their current workflow even if it's manual

**Anxiety (worries about switching to Qarote):**
- "What if Qarote goes down — do we lose visibility into RabbitMQ?" (Qarote reads from RabbitMQ; the management API is still there)
- "What happens to our data if we cancel?" (export available; self-hosted users own everything)
- "Will this work with our RabbitMQ version?" (supports all 3.x and 4.x, LTS and non-LTS on Developer+)

---

## Customer Language

**How they describe the problem:**
- "We had no idea the queue was backing up until users started complaining"
- "I'm tired of manually checking the management plugin every morning"
- "We spent 2 hours in the post-mortem and still don't know exactly what happened"
- "The management plugin is fine for one server but useless when you have multiple"
- "Setting up Prometheus and Grafana just for RabbitMQ feels like overkill"

**How they describe us:**
- "Like the management plugin but actually useful"
- "Grafana for RabbitMQ without the setup"
- "The thing that pages us before our users notice"

**Words to use:**
- Monitor, observe, track, detect, alert, queue, depth, consumer, message rate, backlog, incident, topology
- Real-time, live, instant, immediate
- Simple, direct, purpose-built, no setup
- Technical precision: use RabbitMQ terminology correctly (vhost, exchange, binding, routing key, consumer, publisher, dead-letter)

**Words to avoid:**
- Streamline, optimize, leverage, empower, revolutionary, game-changing
- "Observability platform" (too generic — we're RabbitMQ-specific)
- "Enterprise-grade" as a standalone claim (prove it instead)
- Exclamation points

**Glossary:**
| Term | Meaning in Qarote context |
|------|--------------------------|
| Queue depth | Number of messages waiting in a queue (key health metric) |
| Consumer | Application process that reads messages from a queue |
| Publisher rate | Messages/second being published to a queue or exchange |
| Deliver rate | Messages/second being delivered to consumers |
| Dead-letter queue (DLQ) | Queue that receives rejected/unprocessable messages |
| Vhost | Virtual host — RabbitMQ's namespace isolation unit |
| Topology | The graph of exchanges, queues, and bindings in a vhost |
| Firehose | RabbitMQ's `amq.rabbitmq.trace` exchange — publishes a copy of every message event |
| Workspace | Qarote grouping for a set of RabbitMQ servers (e.g. "Production", "Staging") |

---

## Brand Voice

**Tone:** Direct, technical, confident — no fluff. Speaks to engineers, not managers. Clarity over cleverness.

**Style:** Short sentences. Specific numbers when available. Active voice. No jargon that isn't RabbitMQ-native. Analogies are fine when they make abstract concepts concrete.

**Personality:**
- Precise — says exactly what the product does, with real numbers
- Honest — doesn't oversell; acknowledges when alternatives are fine
- Calm — not excitable; engineers trust tools that don't shout at them
- Practical — every claim connects to a real workflow or problem

**Examples of on-brand copy:**
- ✅ "7 days of queue history. 5-minute snapshots. No Prometheus."
- ✅ "Know when queues are backing up before your users do."
- ✅ "Inspect message payloads without consuming them."
- ❌ "Revolutionize your RabbitMQ observability journey!"
- ❌ "Streamline your queue management workflows."

---

## Proof Points

**Metrics / specifics to cite:**
- Sub-1-second refresh rate for live queue data
- 5-minute snapshot interval for Queue History (7-day retention)
- 2,016 data points per queue per week (Queue History)
- Supports RabbitMQ 3.x and 4.x (all LTS versions on Developer+, all versions on Enterprise)
- Setup in under 5 minutes (connect first server)
- MIT license — Community Edition is genuinely free, no expiration

**Customers/logos:** [Add as available — real company names only]

**Testimonials:** [Add verbatim quotes as available — attributed with role and company type minimum]

**Value themes:**
| Theme | Proof |
|-------|-------|
| No setup overhead | "Connect in 5 minutes. No agent, no Prometheus, no YAML." |
| Purpose-built for RabbitMQ | Terminology, UI, and alerting logic designed specifically for RabbitMQ patterns |
| Data control | MIT Community Edition; self-hosted Enterprise; no data sent externally if self-hosted |
| Proactive not reactive | Alerts fire before users are affected; Queue History surfaces slow-moving trends |

---

## Goals

**Business goal:** Grow MRR through self-serve Developer plan conversions, with Enterprise upsell for larger teams.

**Primary conversion action:** Sign up for free (Community) → convert to Developer plan when hitting limits or needing alerting.

**Key conversion page:** `/auth/sign-up` in the app. Secondary: `/pricing/` for plan comparison, feature pages for specific capability research.

**Current funnel:**
- Awareness: organic search (RabbitMQ monitoring), GitHub, developer communities
- Consideration: landing page, feature pages, pricing page
- Conversion: free sign-up → connect first server → hit free tier limit or incident → upgrade

---

## Upcoming Features (Coming Soon — Premium)

These are in development. Feature pages are live at `/features/[name]/` as waitlist pages.

| Feature | URL | Tier | Core value |
|---------|-----|------|-----------|
| Queue History | `/features/queue-history/` | Developer+ | 7 days of 5-min queue snapshots for post-incident review |
| Message Spy | `/features/message-spy/` | Developer+ | Inspect message headers + payload without consuming |
| Daily Digest | `/features/daily-digest/` | Developer+ | Daily email summary of queue health across all servers |
| Incident Diagnosis Engine | `/features/incident-diagnosis/` | Enterprise | Automated RCA correlating backlogs, consumer drops, publish spikes |
| Message Tracing (Firehose) | `/features/message-tracing/` | Enterprise | Full message-level trace via `amq.rabbitmq.trace` exchange |

Free users get limited access to the first three when released. Incident Diagnosis and Message Tracing are Enterprise-only.
