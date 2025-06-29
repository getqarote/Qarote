# Plans & Pricing Feature

## Overview

The Plans & Pricing feature provides a modern, comprehensive SaaS-style pricing page and plan management system for Rabbit Scout. This feature is designed to help users understand the different subscription tiers, their features, and provide easy upgrade paths.

## Features Implemented

### 1. Plans Page (`/pages/Plans.tsx`)

A full-featured, modern pricing page that includes:

#### Hero Section

- Compelling headline and description
- Feature highlights with icons (Real-time Monitoring, Smart Analytics, Enterprise Security, 24/7 Support)
- Billing toggle (Monthly/Yearly with 20% yearly savings)

#### Plan Cards

- 4 distinct plan tiers: Free, Freelance, Startup, Business
- Clear pricing display with yearly discount indicators
- Feature breakdown by category:
  - Core Features (servers, queues, messages, team members)
  - Advanced Features (routing, export, alerts, memory analysis)
  - Memory & Performance features
  - Support levels
- "Most Popular" badge for Startup plan
- "Current Plan" indicators
- Prominent CTA buttons

#### Feature Comparison Table

- Comprehensive side-by-side comparison
- 5 categories: Infrastructure, Monitoring & Analytics, Advanced Features, Security & Compliance, Support
- Clear visual indicators (checkmarks, X's, specific values)
- Responsive design with horizontal scrolling on mobile
- CTA buttons at the bottom of each column

#### Trust Indicators

- Statistics display (50K+ servers monitored, 1B+ messages processed, etc.)
- Social proof elements

#### Testimonials Section

- 3 customer testimonials with 5-star ratings
- Industry-relevant quotes about memory optimization and monitoring benefits

#### FAQ Section

- 6 common questions about billing, limits, enterprise plans, trials, payments, and security

#### Final CTA Section

- Gradient background with compelling messaging
- Multiple CTA options (Free Trial, View Startup Plan)
- Trust badges (No credit card required, 14-day money-back guarantee)

### 2. Profile Plans Tab (`/components/profile/PlansSummaryTab.tsx`)

A concise plan summary component for the user profile that includes:

- Current plan display with visual styling
- Usage statistics (placeholder data structure ready for real metrics)
- Next upgrade recommendation
- Quick upgrade CTA
- Feature highlights for current plan
- Link to full Plans page

### 3. Plan Upgrade Hook (`/hooks/usePlanUpgrade.ts`)

A reusable hook that handles:

- Plan upgrade navigation
- Upgrade logic (currently shows alert, ready for payment integration)
- Centralized upgrade handling across components

### 4. Integration Points

#### Profile Page Updates

- Added new "Plans" tab to the profile page
- Seamless integration with existing tab structure
- Consistent styling with other profile components

#### Routing Updates

- Added `/plans` route to main app router
- Lazy loading for performance optimization
- Protected route (requires authentication)
- Uses main layout with sidebar

## Technical Implementation

### File Structure

```
/front-end/src/
├── pages/
│   └── Plans.tsx                    # Main plans page
├── components/
│   └── profile/
│       ├── PlansSummaryTab.tsx      # Profile tab component
│       └── index.ts                 # Updated exports
├── hooks/
│   └── usePlanUpgrade.ts            # Upgrade logic hook
└── App.tsx                          # Updated routing
```

### Key Dependencies

- Existing UI components (Button, Card, Badge, Tabs)
- Lucide React icons
- Plan utilities from `@/lib/plans/planUtils`
- Existing workspace plan enums and feature definitions

### Styling

- Tailwind CSS for responsive design
- Gradient backgrounds and modern card layouts
- Consistent color scheme with existing app design
- Mobile-first responsive approach

## Plan Structure

### Free Plan

- 1 server, 5 queues, 10K messages/month
- 1 team member
- Basic memory metrics
- Community support

### Freelance Plan ($49/month, $39/year)

- 3 servers, 25 queues, 100K messages/month
- 3 team members
- Advanced memory analysis, routing, data export
- Email support

### Startup Plan ($99/month, $79/year) - Most Popular

- 10 servers, 100 queues, 1M messages/month
- 10 team members
- Expert memory diagnostics, smart alerts, advanced metrics
- Role-based access control, priority support

### Business Plan ($249/month, $199/year)

- Unlimited servers, queues, and messages
- Unlimited team members
- All features including memory optimization, custom integrations
- SOC 2 compliance, audit logs, phone support, dedicated account manager

## Feature Categories

### Infrastructure

- Server limits
- Queue limits
- Message volume limits
- Team size limits

### Monitoring & Analytics

- Memory metrics (basic → advanced → expert → optimization)
- Advanced metrics dashboard
- Historical trends

### Advanced Features

- Message routing
- Data export capabilities
- Smart alerts & notifications
- API access levels
- Custom integrations

### Security & Compliance

- SSL/TLS encryption (all plans)
- Role-based access control
- Audit logs
- SOC 2 compliance

### Support

- Community forums (all plans)
- Email support
- Priority support
- Phone support
- Dedicated account management

## Future Enhancements

### Payment Integration

- Replace placeholder upgrade logic with real payment processing
- Stripe/payment provider integration
- Subscription management
- Billing history

### Usage Tracking

- Real usage metrics in profile tab
- Usage warnings and notifications
- Overage handling

### Plan Management

- Downgrade capabilities
- Plan change confirmations
- Prorated billing calculations

### Analytics

- Plan upgrade conversion tracking
- Feature usage analytics
- A/B testing for pricing optimization

### Additional Features

- Custom enterprise plan requests
- Team member invitations based on plan limits
- Feature flagging based on plan level
- Usage-based billing options

## Migration Notes

This feature is designed to work alongside existing plan validation logic:

- Maintains compatibility with `planUtils.ts`
- Uses existing `WorkspacePlan` enum
- Integrates with existing feature flags
- Does not break existing plan validation middleware

## Testing Considerations

- Test responsive design across devices
- Verify plan feature accuracy matches backend validation
- Test navigation between pricing page and profile
- Validate upgrade flow UX
- Check accessibility compliance
- Test with different plan states (free, paid, etc.)

## Performance Considerations

- Lazy loading for Plans page reduces initial bundle size
- Optimized images and icons
- Minimal external dependencies
- Efficient re-renders with proper React patterns
