import { useEffect } from "react";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";

/**
 * Hook to sync Clerk user to Convex database on sign-in
 * Should be used in the root App component
 */
export function useSyncUser() {
  const { isSignedIn, isLoaded } = useAuth();
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Sync user data to Convex
      syncUser().catch((error) => {
        console.error("Failed to sync user:", error);
      });
    }
  }, [isLoaded, isSignedIn, syncUser]);
}
