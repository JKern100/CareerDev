export const APP_VERSION = "V.02";

const API_BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // If token is expired/invalid, clear it and redirect to login
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("admin_token");
      localStorage.removeItem("impersonating");
      window.location.href = "/login";
      // Throw to prevent further processing
      throw new Error("Session expired. Redirecting to login...");
    }
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export async function register(email: string, password: string, fullName?: string) {
  return request<{ id: string; email: string; email_verified: boolean }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
}

export async function login(email: string, password: string) {
  const data = await request<{ access_token: string; is_first_login: boolean }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.access_token);
  if (data.is_first_login) {
    localStorage.setItem("is_first_login", "true");
  }
  return data;
}

export async function verifyEmail(token: string) {
  return request<{ detail: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function resendVerification(email: string) {
  return request<{ detail: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function getMe() {
  return request<{
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    questionnaire_completed: boolean;
    current_module: string | null;
    can_regenerate_summary: boolean;
    plan: string;
    is_premium: boolean;
  }>("/auth/me");
}

export async function forgotPassword(email: string) {
  return request<{ detail: string; email_sent: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return request<{ detail: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

// Questionnaire
export interface Question {
  question_id: string;
  module: string;
  prompt: string;
  question_type: string;
  required: boolean;
  options: string[] | null;
  min_val: number | null;
  max_val: number | null;
  tags: string[] | null;
  help_text: string | null;
  option_hints: Record<string, string> | null;
}

export interface ExistingAnswer {
  question_id: string;
  value: string | number | string[] | null;
  confidence: number;
}

export interface QuestionSet {
  module: string;
  module_label: string;
  questions: Question[];
  existing_answers?: ExistingAnswer[];
  progress: number;
  total_questions: number;
  answered_questions: number;
}

export interface CoreScreen {
  screen_id: string;
  screen_label: string;
  screen_number: number;
  total_screens: number;
  tier: number;
  tier1_complete: boolean;
  tier2_complete: boolean;
  questions: Question[];
  existing_answers?: ExistingAnswer[];
}

export async function getCoreNextScreen() {
  return request<CoreScreen>("/questionnaire/core/next");
}

export async function getNextQuestions() {
  return request<QuestionSet>("/questionnaire/next");
}

export async function getModuleQuestions(module: string) {
  return request<QuestionSet>(`/questionnaire/module/${module}`);
}

export interface SubmitAnswersResponse {
  answers: { id: string; question_id: string; value_json: Record<string, unknown>; confidence: number }[];
  next_module: string | null;
  next_module_label: string | null;
  module_complete: boolean;
  questionnaire_complete: boolean;
  progress: number;
}

export async function submitAnswers(
  answers: { question_id: string; value: string | number | string[]; confidence: number }[]
) {
  return request<SubmitAnswersResponse>("/questionnaire/answer", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export interface ModuleStatus {
  module: string;
  module_label: string;
  total_questions: number;
  answered_questions: number;
  required_questions: number;
  required_answered: number;
  is_complete: boolean;
}

export async function getProgress() {
  return request<{
    total_modules: number;
    completed_modules: number;
    total_questions: number;
    answered_questions: number;
    progress_pct: number;
    modules: ModuleStatus[];
    tier1_complete: boolean;
    tier2_complete: boolean;
  }>("/questionnaire/progress");
}

export async function completeQuestionnaire() {
  return request("/questionnaire/complete", { method: "POST" });
}

// Summary
export interface SummaryReport {
  summary_text: string;
  generated_with_ai: boolean;
  created_at: string | null;
}

export async function generateSummary() {
  return request<SummaryReport>("/analysis/summary", { method: "POST" });
}

export async function getSummary() {
  return request<SummaryReport>("/analysis/summary");
}

// Analysis
export async function runAnalysis() {
  return request<{ job_id: string; status: string }>("/analysis/run", {
    method: "POST",
  });
}

export interface PathwayResult {
  pathway_id: string;
  pathway_name: string;
  description: string;
  adjusted_score: number;
  raw_score: number;
  typical_roles: string[];
  salary_band_refs: Record<string, { min_aed: number; max_aed: number; source: string }> | null;
  salary_global_note: string | null;
  recommended_credentials: { name: string; duration: string; source_url: string }[] | null;
  gate_flags: string[] | null;
  top_evidence_signals: string[] | null;
  risks_unknowns: string[] | null;
}

export async function getResults() {
  return request<PathwayResult[]>("/analysis/results");
}

export interface CareerAnalysis {
  markdown_report: string;
  model_name: string;
  created_at: string;
  can_regenerate: boolean;
}

export async function getCareerReport() {
  return request<CareerAnalysis>("/results");
}

// Admin
export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  questionnaire_completed: boolean;
  current_module: string | null;
  can_regenerate: boolean;
  can_regenerate_summary: boolean;
  answers_count: number;
  reports_count: number;
  has_analysis_report: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  users_completed_questionnaire: number;
  users_with_reports: number;
  total_answers: number;
  total_reports: number;
  users_last_7_days: number;
  users_last_30_days: number;
  completion_rate: number;
  avg_answers_per_user: number;
}

export interface AdminQuestion {
  question_id: string;
  module: string;
  prompt: string;
  question_type: string;
  required: boolean;
  options_json: string[] | null;
  min_val: number | null;
  max_val: number | null;
  tags_json: string[] | null;
  order: number;
}

export const QUESTION_TYPES = [
  "single_select", "multi_select", "likert_1_5", "slider_0_10",
  "numeric", "text_short", "text_long", "file_upload",
] as const;

export const MODULES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export const MODULE_LABELS: Record<string, string> = {
  A: "Consent & Baseline",
  B: "Aviation Profile & Satisfaction",
  C: "Transferable Skills & Evidence",
  D: "Work Style & Environment Preferences",
  E: "Constraints & Feasibility",
  F: "Location & Mobility",
  G: "Compensation & Benefits Modeling",
  H: "Learning, Credentials & Study Pathways",
};

export interface UserAnswer {
  question_id: string;
  value: string | number | string[] | null;
  confidence: number;
  created_at: string | null;
}

export async function getAdminStats() {
  return request<DashboardStats>("/admin/stats");
}

export async function getAdminUsers() {
  return request<AdminUser[]>("/admin/users");
}

export async function getAdminUser(userId: string) {
  return request<AdminUser>(`/admin/users/${userId}`);
}

export async function updateAdminUser(userId: string, data: Record<string, unknown>) {
  return request<{ detail: string }>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminUser(userId: string) {
  return request<{ detail: string }>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export async function getUserAnswers(userId: string) {
  return request<UserAnswer[]>(`/admin/users/${userId}/answers`);
}

export async function resetUserAnswers(userId: string) {
  return request<{ detail: string }>(`/admin/users/${userId}/answers`, {
    method: "DELETE",
  });
}

export async function getAdminQuestions() {
  return request<AdminQuestion[]>("/admin/questions");
}

export async function createAdminQuestion(data: Record<string, unknown>) {
  return request<AdminQuestion>("/admin/questions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminQuestion(questionId: string, data: Record<string, unknown>) {
  return request<{ detail: string }>(`/admin/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminQuestion(questionId: string) {
  return request<{ detail: string }>(`/admin/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function reorderAdminQuestion(questionId: string, direction: "up" | "down") {
  return request<{ detail: string }>("/admin/questions/reorder", {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, direction }),
  });
}

export async function promoteUser(userId: string) {
  return request<{ detail: string }>(`/admin/promote/${userId}`, {
    method: "POST",
  });
}

export async function impersonateUser(userId: string) {
  return request<{ access_token: string; user_email: string; user_name: string | null }>(
    `/admin/impersonate/${userId}`,
    { method: "POST" }
  );
}

export interface AdminAnalysisReport {
  markdown_report: string;
  model_name: string;
  created_at: string;
}

export async function getUserReport(userId: string) {
  return request<AdminAnalysisReport>(`/admin/users/${userId}/report`);
}

export interface ActivityEvent {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  detail: string | null;
  created_at: string;
}

export async function getActivityLog(params?: { role?: string; action?: string; days?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set("role", params.role);
  if (params?.action) searchParams.set("action", params.action);
  if (params?.days) searchParams.set("days", String(params.days));
  const qs = searchParams.toString();
  return request<ActivityEvent[]>(`/admin/activity${qs ? `?${qs}` : ""}`);
}

export async function getUserActivity(userId: string, params?: { action?: string; days?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.action) searchParams.set("action", params.action);
  if (params?.days) searchParams.set("days", String(params.days));
  const qs = searchParams.toString();
  return request<ActivityEvent[]>(`/admin/users/${userId}/activity${qs ? `?${qs}` : ""}`);
}

// Scheduling
export interface AdvisorProfile {
  id: string;
  user_id: string;
  name: string | null;
  bio: string | null;
  credentials: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  timezone: string | null;
  session_duration_minutes: number;
  active: boolean;
}

export interface AvailabilitySlotData {
  id: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
}

export interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
}

export interface BookingData {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  advisor_id: string;
  advisor_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string | null;
}

// Advisor self-service
export async function getMyAdvisorProfile() {
  return request<AdvisorProfile>("/scheduling/my-profile");
}

export async function updateMyAdvisorProfile(data: Partial<AdvisorProfile>) {
  return request<AdvisorProfile>("/scheduling/my-profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getMyAvailability() {
  return request<AvailabilitySlotData[]>("/scheduling/my-availability");
}

export async function setMyAvailability(slots: { day_of_week: number; start_time: string; end_time: string }[]) {
  return request<{ detail: string }>("/scheduling/my-availability", {
    method: "PUT",
    body: JSON.stringify({ slots }),
  });
}

export async function getMyAdvisorBookings() {
  return request<BookingData[]>("/scheduling/my-bookings");
}

// User-facing
export async function listAdvisors() {
  return request<AdvisorProfile[]>("/scheduling/advisors");
}

export async function getAdvisorSlots(advisorId: string, daysAhead = 14) {
  return request<TimeSlot[]>(`/scheduling/advisors/${advisorId}/slots?days_ahead=${daysAhead}`);
}

export async function bookSession(advisorId: string, date: string, startTime: string) {
  return request<BookingData>("/scheduling/book", {
    method: "POST",
    body: JSON.stringify({ advisor_id: advisorId, date, start_time: startTime }),
  });
}

export async function getMyUserBookings() {
  return request<BookingData[]>("/scheduling/my-user-bookings");
}

export async function cancelBooking(bookingId: string) {
  return request<{ detail: string }>(`/scheduling/cancel/${bookingId}`, {
    method: "POST",
  });
}

export async function getAllBookings() {
  return request<BookingData[]>("/scheduling/all-bookings");
}

// Coach
export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CoachGoal {
  id: string;
  title: string;
  target_date: string | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export async function sendCoachMessage(message: string) {
  return request<{ reply: string }>("/coach/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function getCoachHistory(limit = 50, offset = 0) {
  return request<CoachMessage[]>(`/coach/history?limit=${limit}&offset=${offset}`);
}

export async function clearCoachHistory() {
  return request<{ detail: string }>("/coach/history", { method: "DELETE" });
}

export async function getCoachGoals() {
  return request<CoachGoal[]>("/coach/goals");
}

export async function createCoachGoal(title: string, targetDate?: string) {
  return request<CoachGoal>("/coach/goals", {
    method: "POST",
    body: JSON.stringify({ title, target_date: targetDate || null }),
  });
}

export async function updateCoachGoal(goalId: string, data: { completed?: boolean; title?: string; target_date?: string }) {
  return request<CoachGoal>(`/coach/goals/${goalId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCoachGoal(goalId: string) {
  return request<{ detail: string }>(`/coach/goals/${goalId}`, { method: "DELETE" });
}

// Action Plan
export interface ActionStepData {
  id: string;
  pathway_id: string | null;
  pathway_name: string | null;
  category: "this_week" | "first_step" | "credential";
  title: string;
  description: string | null;
  url: string | null;
  duration: string | null;
  sort_order: number;
  status: "todo" | "in_progress" | "done" | "skipped";
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface ActionPlan {
  total: number;
  done: number;
  in_progress: number;
  skipped: number;
  steps: ActionStepData[];
}

export async function getActionPlan() {
  return request<ActionPlan>("/action-plan");
}

export async function generateActionPlan() {
  return request<ActionPlan>("/action-plan/generate", { method: "POST" });
}

export async function updateActionStep(stepId: string, data: { status?: string; notes?: string }) {
  return request<ActionStepData>(`/action-plan/steps/${stepId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Payment
export interface SubscriptionStatus {
  plan: string;
  is_active: boolean;
  is_premium: boolean;
  activated_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
}

export async function createCheckout(plan: "pro" | "premium" | "monthly") {
  return request<{ checkout_url: string }>("/payment/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function getSubscription() {
  return request<SubscriptionStatus>("/payment/subscription");
}
