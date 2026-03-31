/**
 * Client-side feature flags derived from environment variables.
 * These are baked in at build time via Next.js NEXT_PUBLIC_ prefix.
 */
export const settings = {
  googleOAuthEnabled: process.env.NEXT_PUBLIC_GOOGLE_OAUTH === "true",
};
