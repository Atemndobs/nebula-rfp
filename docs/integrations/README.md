# Integrations

This directory contains documentation for external service integrations.

## Available Integrations

| Integration                                                                    | Status   | Purpose                            |
| ------------------------------------------------------------------------------ | -------- | ---------------------------------- |
| [PostHog](./posthog/README.md)                                                 | ✅ Active | Product analytics & event tracking |
| [Clerk](../implementation-plan/architecture/README.md#security-architecture)   | ✅ Active | Authentication                     |
| [Convex](../implementation-plan/architecture/README.md#technical-architecture) | ✅ Active | Backend & Database                 |

## Integration Guidelines

When adding new integrations:

1. **Create documentation first** - Document architecture before implementing
2. **Use environment variables** - Never hardcode API keys
3. **Consider costs** - Document pricing and expected usage
4. **Plan for failure** - Include error handling and fallback strategies
5. **Privacy compliance** - Ensure GDPR/CCPA compliance where applicable

## Cost Tracking

| Integration | Tier | Monthly Cost | Notes                   |
| ----------- | ---- | ------------ | ----------------------- |
| Clerk       | Free | $0           | Up to 10k MAU           |
| Convex      | Free | $0           | Up to 1M function calls |
| PostHog     | Free | $0           | 1M events/month         |

## Adding New Integrations

Use the structure:
```
docs/integrations/[service-name]/
├── README.md           # Overview & quick start
├── ARCHITECTURE.md     # Technical design
└── IMPLEMENTATION.md   # Step-by-step guide
```
