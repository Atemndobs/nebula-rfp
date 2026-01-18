// Clerk authentication configuration for Convex
// Configure CLERK_ISSUER_URL in the Convex dashboard environment variables

export default {
  providers: [
    {
      // This domain should match your Clerk application
      // Set CLERK_ISSUER_URL in Convex dashboard (e.g., https://your-app.clerk.accounts.dev)
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};
