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
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export async function register(email: string, password: string, fullName?: string) {
  return request<{ id: string; email: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
}

export async function login(email: string, password: string) {
  const data = await request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function getMe() {
  return request<{
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    questionnaire_completed: boolean;
    current_module: string | null;
  }>("/auth/me");
}

export async function forgotPassword(email: string) {
  return request<{ detail: string }>("/auth/forgot-password", {
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
  recommended_credentials: { name: string; duration: string; source_url: string }[] | null;
  gate_flags: string[] | null;
  top_evidence_signals: string[] | null;
  risks_unknowns: string[] | null;
}

export async function getResults() {
  return request<PathwayResult[]>("/analysis/results");
}

// Admin
export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  questionnaire_completed: boolean;
  current_module: string | null;
  answers_count: number;
  reports_count: number;
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
}

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

export async function getAdminQuestions() {
  return request<AdminQuestion[]>("/admin/questions");
}

export async function updateAdminQuestion(questionId: string, data: Record<string, unknown>) {
  return request<{ detail: string }>(`/admin/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
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
