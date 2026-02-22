import posthog from 'posthog-js';

/**
 * Initialize PostHog analytics.
 * Call this once in index.tsx before React renders.
 */
export function initPostHog(): void {
    const apiKey = import.meta.env.VITE_POSTHOG_KEY;

    if (!apiKey) {
        console.warn('[PostHog] No API key found, analytics disabled');
        return;
    }

    posthog.init(apiKey, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',

        // Privacy settings
        person_profiles: 'identified_only',

        // Automatic tracking
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,

        // Disable until needed
        disable_session_recording: true,

        // Performance
        loaded: (_posthog) => {
            if (import.meta.env.DEV) {
                // Disable in development to avoid polluting data
                // posthog.opt_out_capturing();
                console.log('[PostHog] Initialized in development mode');
            }
        },
    });
}

/**
 * Event name constants for type safety.
 */
export const POSTHOG_EVENTS = {
    // RFP Events
    RFP_VIEWED: 'rfp_viewed',
    RFP_SHORTLISTED: 'rfp_shortlisted',
    RFP_REMOVED_FROM_SHORTLIST: 'rfp_removed_from_shortlist',

    // Evaluation Events
    EVALUATION_RUN: 'evaluation_run',
    EVALUATION_COMPLETED: 'evaluation_completed',

    // Pursuit Events
    PURSUIT_DECISION: 'pursuit_decision',
    PURSUIT_STATUS_CHANGED: 'pursuit_status_changed',

    // Export Events
    CSV_EXPORTED: 'csv_exported',

    // Settings Events
    FILTER_APPLIED: 'filter_applied',
    AI_SETTINGS_CHANGED: 'ai_settings_changed',
    DATA_SOURCE_TOGGLED: 'data_source_toggled',
} as const;

export { posthog };
