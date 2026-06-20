import { track } from "@vercel/analytics";

/**
 * Funnel event names. We keep the original hook_* names for data continuity
 * and add clearer assessment_* / *_view names alongside them (per funnel spec).
 */
export type FunnelEvent =
  | "landing_view"
  | "assessment_started"
  | "assessment_completed"
  | "result_viewed"
  | "signup_completed"
  // legacy names kept firing alongside the new ones
  | "hook_started"
  | "hook_completed"
  | "hero_cta_click"
  | "unlock_clicked";

/**
 * True when this browser belongs to a logged-in admin. We persist an
 * `admin_token` for admins (used for impersonation return), so its presence is
 * a reliable signal that the visit is internal and should be excluded from
 * funnel analytics.
 */
function isAdminBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("admin_token");
}

/**
 * track() wrapper that suppresses events for internal/admin traffic so funnel
 * counts reflect real visitors only.
 */
export function trackEvent(
  event: FunnelEvent,
  props?: Record<string, string | number | boolean>
) {
  if (isAdminBrowser()) return;
  track(event, props);
}
