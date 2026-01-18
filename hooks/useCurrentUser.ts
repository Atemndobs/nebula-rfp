import { useQuery } from "convex/react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";

/**
 * Hook to get current user data from both Clerk and Convex
 */
export function useCurrentUser() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isSignedIn } = useAuth();

  // Only query Convex if user is signed in
  const convexUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn ? {} : "skip"
  );

  return {
    // Clerk user data
    clerkUser,
    // Convex user data (with role, etc.)
    convexUser,
    // Loading state
    isLoaded: clerkLoaded && (convexUser !== undefined || !isSignedIn),
    // Auth state
    isSignedIn: !!clerkUser,
    // Role helpers
    isAdmin: convexUser?.role === "admin",
    isManager: convexUser?.role === "manager" || convexUser?.role === "admin",
    // User ID from Convex
    userId: convexUser?._id,
  };
}
