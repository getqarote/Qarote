import * as React from "react";

import * as AccordionPrimitive from "@radix-ui/react-accordion";

import { cn } from "@/lib/utils";

type AccordionProps = React.ComponentPropsWithoutRef<
  typeof AccordionPrimitive.Root
> & {
  children?: React.ReactNode;
};

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ children, ...props }, ref) => (
    <AccordionPrimitive.Root ref={ref} {...props}>
      {children}
    </AccordionPrimitive.Root>
  )
) as unknown as React.ComponentType<AccordionProps>;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
    children?: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  >
    {children}
  </AccordionPrimitive.Item>
)) as unknown as React.ComponentType<
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
    children?: React.ReactNode;
    className?: string;
  }
>;
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    children?: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline group",
        className
      )}
      {...props}
    >
      {children}
      <div className="relative h-8 w-8 shrink-0">
        <span className="plus absolute inset-0 flex items-center justify-center text-primary font-light text-3xl transition-all duration-200 opacity-100 rotate-0 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90">
          +
        </span>
        <span className="minus absolute inset-0 flex items-center justify-center text-primary font-light text-3xl transition-all duration-200 opacity-0 -rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0">
          −
        </span>
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
)) as unknown as React.ComponentType<
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    children?: React.ReactNode;
    className?: string;
  }
>;
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & {
    children?: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
)) as unknown as React.ComponentType<
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & {
    children?: React.ReactNode;
    className?: string;
  }
>;
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
