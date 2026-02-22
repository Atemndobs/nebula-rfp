import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { posthog } from '../../lib/posthog';

interface PostHogIdentifierProps {
    children: React.ReactNode;
}

/**
 * Syncs Clerk user identity with PostHog.
 * Wrap this around your app inside ClerkProvider.
 */
export function PostHogIdentifier({ children }: PostHogIdentifierProps) {
    const { user, isSignedIn, isLoaded } = useUser();

    useEffect(() => {
        if (!isLoaded) return;

        if (isSignedIn && user) {
            // Identify user in PostHog with Clerk ID
            posthog.identify(user.id, {
                email: user.primaryEmailAddress?.emailAddress,
                name: user.fullName,
                createdAt: user.createdAt,
            });
        } else {
            // Clear identity on logout
            posthog.reset();
        }
    }, [isSignedIn, isLoaded, user]);

    return <>{children}</>;
}
