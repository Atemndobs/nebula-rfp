import { useCallback } from 'react';
import { posthog, POSTHOG_EVENTS } from '../lib/posthog';

interface UseAnalyticsReturn {
    /**
     * Track a custom event.
     * @param event - Event name (use POSTHOG_EVENTS constants)
     * @param properties - Optional event properties
     */
    track: (event: string, properties?: Record<string, unknown>) => void;

    /**
     * Identify a user (called automatically on Clerk sign-in).
     */
    identify: (userId: string, traits?: Record<string, unknown>) => void;

    /**
     * Reset user identity (called automatically on sign-out).
     */
    reset: () => void;

    /**
     * Direct access to PostHog instance for advanced usage.
     */
    posthog: typeof posthog;

    /**
     * Event name constants.
     */
    events: typeof POSTHOG_EVENTS;
}

/**
 * React hook for PostHog analytics.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { track, events } = useAnalytics();
 *
 *   const handleClick = () => {
 *     track(events.RFP_VIEWED, { rfpId: '123', source: 'sam_gov' });
 *   };
 * }
 * ```
 */
export function useAnalytics(): UseAnalyticsReturn {
    const track = useCallback((event: string, properties?: Record<string, unknown>) => {
        posthog.capture(event, properties);
    }, []);

    const identify = useCallback((userId: string, traits?: Record<string, unknown>) => {
        posthog.identify(userId, traits);
    }, []);

    const reset = useCallback(() => {
        posthog.reset();
    }, []);

    return {
        track,
        identify,
        reset,
        posthog,
        events: POSTHOG_EVENTS,
    };
}
