import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem
        value="item-1"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          What is Qarote?
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          Qarote is a modern, user-friendly dashboard that helps you monitor and
          manage your RabbitMQ servers effortlessly. Instead of using clunky
          command-line tools or the default RabbitMQ management plugin, Qarote
          gives you a clean, visual interface to see your queues, messages, and
          system health in real time.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-2"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          Who is Qarote for?
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          Qarote is designed for developers, DevOps engineers, and teams who use
          RabbitMQ and want better visibility, easier troubleshooting, and
          smarter alerts. Whether you manage one broker or dozens, Qarote helps
          you save time and prevent message bottlenecks.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-3"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          Is Qarote secure?
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          Absolutely. All connections to your RabbitMQ servers are encrypted
          (TLS), and no sensitive data is stored on our servers—only your
          configuration and alert preferences. Qarote only reads the metrics and
          management data needed for your dashboard.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-4"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          What can I do with Qarote?
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          With Qarote, you can:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Monitor queue depths, message rates, and consumer counts</li>
            <li>Set up alerts for queue backlogs or server health issues</li>
            <li>Visualize memory usage, file descriptors, and more</li>
            <li>Pause, resume, or delete queues with one click</li>
            <li>Publish messages directly to queues or exchanges</li>
            <li>Connect multiple RabbitMQ instances in one place</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-5"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          How is Qarote different from the RabbitMQ Management UI?
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          The built-in RabbitMQ Management Plugin works, but it's slow,
          cluttered, and hard to scale across multiple brokers. Qarote offers:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>A faster, more intuitive interface</li>
            <li>Multi-server support in one dashboard</li>
            <li>Smart, customizable alerts</li>
            <li>Beautiful, real-time charts and metrics</li>
            <li>A clean experience designed for teams</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-6"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          Is Qarote a better monitoring tool than Prometheus and Grafana?
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          Qarote offers purpose-built monitoring specifically for RabbitMQ with
          zero configuration. While Prometheus and Grafana are powerful, they
          require significant setup and maintenance. Qarote provides comparable
          insights with much less overhead.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-7"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          Can I try Qarote for free?
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          Yes! We offer a free tier that includes 1 server, 1 workspace, and 1
          team member. You can start monitoring your RabbitMQ queues right away
          without a credit card. When you're ready to scale, you can upgrade to
          a paid plan.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default FAQ;
