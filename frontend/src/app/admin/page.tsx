"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getMe,
  getAdminStats,
  getAdminUsers,
  getAdminQuestions,
  updateAdminUser,
  deleteAdminUser,
  updateAdminQuestion,
  createAdminQuestion,
  deleteAdminQuestion,
  reorderAdminQuestion,
  getUserAnswers,
  getUserReport,
  getActivityLog,
  impersonateUser,
  DashboardStats,
  AdminUser,
  AdminQuestion,
  AdminAnalysisReport,
  ActivityEvent,
  UserAnswer,
  QUESTION_TYPES,
  MODULES,
  MODULE_LABELS,
  regenerateUserSummary,
} from "@/lib/api";

type Tab = "dashboard" | "users" | "questions" | "activity";

/* ── Help Content ─────────────────────────────────────────────────────── */

const HELP_CONTENT: Record<Tab, { title: string; sections: { heading: string; body: string }[] }> = {
  dashboard: {
    title: "Dashboard Help",
    sections: [
      {
        heading: "Overview",
        body: "The dashboard shows key metrics about your application's usage. Stats refresh each time you visit this tab.",
      },
      {
        heading: "Metrics Explained",
        body: `- **Total Users**: All registered accounts.\n- **Completed Questionnaire**: Users who finished all 8 modules.\n- **Completion Rate**: Percentage of users who completed the questionnaire.\n- **Users with Reports**: Users who have generated an analysis report.\n- **Total Answers / Reports**: Aggregate counts across all users.\n- **Avg Answers/User**: Average number of answered questions per user.\n- **New (7/30 days)**: Recently registered users.`,
      },
    ],
  },
  users: {
    title: "User Management Help",
    sections: [
      {
        heading: "Viewing Users",
        body: "Search users by email or name. Click **View** to see their full profile, answers, and management options.",
      },
      {
        heading: "Roles",
        body: `- **user**: Standard user, can take the questionnaire.\n- **advisor**: Can manage their own scheduling availability.\n- **admin**: Full access to the admin panel.\n- **auditor**: Read-only admin access (same view, cannot modify).`,
      },
      {
        heading: "Actions",
        body: `- **Change Role**: Select a new role from the dropdown.\n- **Reset Questionnaire**: Clears their completion flag so they can retake it.\n- **View as User**: Opens the app as that user (impersonation). Your admin session is preserved.\n- **Delete User**: Permanently removes the user and all their answers, reports, and pathway scores. This cannot be undone.`,
      },
    ],
  },
  activity: {
    title: "Activity Log Help",
    sections: [
      {
        heading: "Overview",
        body: "The activity log tracks key user actions: logins, questionnaire completions, and report generation. Use the filters to narrow results by role, action type, or time window.",
      },
      {
        heading: "Filters",
        body: `- **Role**: Filter by user role (user, advisor, admin, auditor).\n- **Action**: Filter by action type (login, questionnaire_completed, report_generated).\n- **Days**: Show events from the last N days (default: 30).`,
      },
    ],
  },
  questions: {
    title: "Question Management Help",
    sections: [
      {
        heading: "Overview",
        body: "Manage the 108-question questionnaire organized across 8 modules (A through H). Questions are shown in module order.",
      },
      {
        heading: "Editing a Question",
        body: "Click the **Edit** button (pencil icon) to open the full editor. You can change the prompt text, type, module, required flag, options (for select types), value range (for numeric/slider types), and tags.",
      },
      {
        heading: "Question Types",
        body: `- **single_select**: Radio-button choice from a list of options.\n- **multi_select**: Checkbox selection of multiple options.\n- **likert_1_5**: 1-to-5 agreement scale.\n- **slider_0_10**: Draggable slider from 0 to 10.\n- **numeric**: Free-form number entry with optional min/max.\n- **text_short**: Single-line text input.\n- **text_long**: Multi-line textarea for detailed responses.\n- **file_upload**: File attachment (certificates, screenshots, etc.).`,
      },
      {
        heading: "Adding a Question",
        body: 'Click **+ Add Question** to create a new question. You must provide a unique ID (e.g. "Q109"), select a module, type, and write the prompt text. The question is added to the end of its module.',
      },
      {
        heading: "Moving Questions",
        body: "Use the up/down arrow buttons to reorder questions within their module. This changes the order users see them.",
      },
      {
        heading: "Deleting a Question",
        body: "Click the trash icon to delete a question. If users have already answered it, those answers will also be deleted. This cannot be undone.",
      },
      {
        heading: "Modules",
        body: Object.entries(MODULE_LABELS).map(([k, v]) => `- **Module ${k}**: ${v}`).join("\n"),
      },
    ],
  },
};

/* ── Help Modal Component ─────────────────────────────────────────────── */

function HelpModal({ tab, onClose }: { tab: Tab; onClose: () => void }) {
  const help = HELP_CONTENT[tab];
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>{help.title}</h2>
          <button style={modalStyles.closeBtn} onClick={onClose}>X</button>
        </div>
        <div style={modalStyles.body}>
          {help.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#93c5fd", marginBottom: "0.5rem" }}>
                {s.heading}
              </h3>
              <div style={{ color: "#cbd5e1", fontSize: "0.88rem", lineHeight: "1.6" }}>
                {s.body.split("\n").map((line, j) => {
                  // Render bold markdown
                  const parts = line.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={j} style={{ margin: "0.2rem 0" }}>
                      {parts.map((part, k) =>
                        k % 2 === 1 ? <strong key={k} style={{ color: "#f1f5f9" }}>{part}</strong> : part
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Question Editor Modal ─────────────────────────────────────────── */

interface QuestionEditorProps {
  question: AdminQuestion | null; // null = creating new
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

function QuestionEditor({ question, onSave, onClose }: QuestionEditorProps) {
  const isNew = !question;
  const [questionId, setQuestionId] = useState(question?.question_id || "");
  const [module, setModule] = useState(question?.module || "A");
  const [prompt, setPrompt] = useState(question?.prompt || "");
  const [questionType, setQuestionType] = useState(question?.question_type || "single_select");
  const [required, setRequired] = useState(question?.required ?? true);
  const [optionsText, setOptionsText] = useState(
    question?.options_json ? question.options_json.join("\n") : ""
  );
  const [minVal, setMinVal] = useState<string>(question?.min_val?.toString() || "");
  const [maxVal, setMaxVal] = useState<string>(question?.max_val?.toString() || "");
  const [tagsText, setTagsText] = useState(
    question?.tags_json ? question.tags_json.join(", ") : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const needsOptions = ["single_select", "multi_select"].includes(questionType);
  const needsRange = ["likert_1_5", "slider_0_10", "numeric"].includes(questionType);

  async function handleSave() {
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }
    if (isNew && !questionId.trim()) {
      setError("Question ID is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        prompt: prompt.trim(),
        question_type: questionType,
        required,
      };

      if (isNew) {
        payload.question_id = questionId.trim();
        payload.module = module;
      } else {
        payload.module = module;
      }

      if (needsOptions && optionsText.trim()) {
        payload.options_json = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
      } else if (!needsOptions) {
        payload.options_json = null;
      }

      if (needsRange) {
        if (minVal) payload.min_val = parseFloat(minVal);
        if (maxVal) payload.max_val = parseFloat(maxVal);
      }

      if (tagsText.trim()) {
        payload.tags_json = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      }

      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...modalStyles.modal, maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
            {isNew ? "Add New Question" : `Edit ${question.question_id}`}
          </h2>
          <button style={modalStyles.closeBtn} onClick={onClose}>X</button>
        </div>
        <div style={modalStyles.body}>
          {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>}

          {isNew && (
            <div style={fieldStyles.group}>
              <label style={fieldStyles.label}>Question ID</label>
              <input
                style={fieldStyles.input}
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                placeholder="e.g. Q109"
              />
              <p style={fieldStyles.hint}>Must be unique. Convention: Q + 3-digit number.</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={fieldStyles.group}>
              <label style={fieldStyles.label}>Module</label>
              <select
                style={fieldStyles.select}
                value={module}
                onChange={(e) => setModule(e.target.value)}
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m} - {MODULE_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldStyles.group}>
              <label style={fieldStyles.label}>Question Type</label>
              <select
                style={fieldStyles.select}
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={fieldStyles.group}>
            <label style={fieldStyles.label}>Prompt</label>
            <textarea
              style={{ ...fieldStyles.input, minHeight: "80px", resize: "vertical" }}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the question text..."
            />
          </div>

          <div style={fieldStyles.group}>
            <label style={fieldStyles.label}>
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Required
            </label>
          </div>

          {needsOptions && (
            <div style={fieldStyles.group}>
              <label style={fieldStyles.label}>Options (one per line)</label>
              <textarea
                style={{ ...fieldStyles.input, minHeight: "100px", resize: "vertical" }}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={"Option 1\nOption 2\nOption 3"}
              />
            </div>
          )}

          {needsRange && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={fieldStyles.group}>
                <label style={fieldStyles.label}>Min Value</label>
                <input
                  style={fieldStyles.input}
                  type="number"
                  value={minVal}
                  onChange={(e) => setMinVal(e.target.value)}
                />
              </div>
              <div style={fieldStyles.group}>
                <label style={fieldStyles.label}>Max Value</label>
                <input
                  style={fieldStyles.input}
                  type="number"
                  value={maxVal}
                  onChange={(e) => setMaxVal(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={fieldStyles.group}>
            <label style={fieldStyles.label}>Tags (comma-separated)</label>
            <input
              style={fieldStyles.input}
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="e.g. baseline, location, consent"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <button style={styles.btnOutline} onClick={onClose}>Cancel</button>
            <button
              style={{ ...styles.btnSmall, background: "#2563eb", padding: "0.5rem 1.25rem", fontSize: "0.9rem" }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Question" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Confirm Dialog ───────────────────────────────────────────────── */

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={modalStyles.overlay} onClick={onCancel}>
      <div style={{ ...modalStyles.modal, maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{title}</h2>
          <button style={modalStyles.closeBtn} onClick={onCancel}>X</button>
        </div>
        <div style={modalStyles.body}>
          <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5 }}>{message}</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
            <button style={styles.btnOutline} onClick={onCancel}>Cancel</button>
            <button style={styles.btnDanger} onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Admin Page ──────────────────────────────────────────────── */

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dashboard
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");

  // Questions
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [questionFilter, setQuestionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  // Activity
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [activityRoleFilter, setActivityRoleFilter] = useState("");
  const [activityActionFilter, setActivityActionFilter] = useState("");
  const [activityDays, setActivityDays] = useState(30);

  // Report viewer
  const [viewingReport, setViewingReport] = useState<AdminAnalysisReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Modals
  const [showHelp, setShowHelp] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null | "new">(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminQuestion | null>(null);

  // Feedback
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    getMe()
      .then((user) => {
        if (user.role !== "admin" && user.role !== "auditor") {
          router.push("/");
          return;
        }
        loadDashboard();
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  // Auto-clear feedback messages
  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(""), 4000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const s = await getAdminStats();
      setStats(s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const u = await getAdminUsers();
      setUsers(u);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const q = await getAdminQuestions();
      setQuestions(q);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadActivity(role?: string, action?: string, days?: number) {
    setLoading(true);
    try {
      const events = await getActivityLog({
        role: role || undefined,
        action: action || undefined,
        days: days || 30,
      });
      setActivity(events);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }

  async function handleTabChange(t: Tab) {
    setTab(t);
    setError("");
    setActionMsg("");
    setSelectedUser(null);
    setViewingReport(null);
    if (t === "dashboard") await loadDashboard();
    if (t === "users") await loadUsers();
    if (t === "questions") await loadQuestions();
    if (t === "activity") await loadActivity();
  }

  async function handleViewAnswers(user: AdminUser) {
    setSelectedUser(user);
    setViewingReport(null);
    try {
      const a = await getUserAnswers(user.id);
      setUserAnswers(a);
    } catch {
      setUserAnswers([]);
    }
  }

  async function handleViewReport(userId: string) {
    setReportLoading(true);
    try {
      const report = await getUserReport(userId);
      setViewingReport(report);
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "No report found");
      setViewingReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    try {
      await updateAdminUser(userId, { role });
      setActionMsg("Role updated");
      await loadUsers();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleResetQuestionnaire(userId: string) {
    try {
      await updateAdminUser(userId, { questionnaire_completed: false });
      setActionMsg("Questionnaire reset");
      await loadUsers();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleToggleRegenerate(userId: string, enable: boolean) {
    try {
      await updateAdminUser(userId, { can_regenerate: enable });
      setActionMsg(enable ? "Report regeneration enabled" : "Report regeneration disabled");
      await loadUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, can_regenerate: enable });
      }
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleRegenerateSummary(userId: string) {
    try {
      setActionMsg("Regenerating profile summary...");
      const result = await regenerateUserSummary(userId);
      setActionMsg(result.detail + (result.generated_with_ai ? " (AI)" : " (template)"));
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed to regenerate summary");
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? This removes all their data.`)) return;
    try {
      await deleteAdminUser(userId);
      setActionMsg("User deleted");
      setSelectedUser(null);
      await loadUsers();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleImpersonate(userId: string, email: string) {
    if (!confirm(`Log in as ${email}? You'll be viewing the app as this user.`)) return;
    try {
      const adminToken = localStorage.getItem("token");
      const result = await impersonateUser(userId);
      localStorage.setItem("admin_token", adminToken || "");
      localStorage.setItem("token", result.access_token);
      localStorage.setItem("impersonating", email);
      router.push("/questionnaire");
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed to impersonate");
    }
  }

  async function handleSaveQuestion(data: Record<string, unknown>) {
    if (editingQuestion === "new") {
      await createAdminQuestion(data);
      setActionMsg("Question created");
    } else if (editingQuestion) {
      await updateAdminQuestion(editingQuestion.question_id, data);
      setActionMsg("Question updated");
    }
    await loadQuestions();
  }

  async function handleDeleteQuestion(q: AdminQuestion) {
    try {
      const result = await deleteAdminQuestion(q.question_id);
      setActionMsg(result.detail);
      setConfirmDelete(null);
      await loadQuestions();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed to delete");
      setConfirmDelete(null);
    }
  }

  async function handleMoveQuestion(questionId: string, direction: "up" | "down") {
    try {
      await reorderAdminQuestion(questionId, direction);
      await loadQuestions();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed to move");
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = !userRoleFilter || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredQuestions = questions.filter((q) => {
    const matchesText =
      q.question_id.toLowerCase().includes(questionFilter.toLowerCase()) ||
      q.prompt.toLowerCase().includes(questionFilter.toLowerCase());
    const matchesModule = moduleFilter === "all" || q.module === moduleFilter;
    return matchesText && matchesModule;
  });

  if (loading && !stats && users.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Help Modal */}
      {showHelp && <HelpModal tab={tab} onClose={() => setShowHelp(false)} />}

      {/* Question Editor Modal */}
      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion === "new" ? null : editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}

      {/* Delete Confirm Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Question"
          message={`Are you sure you want to delete "${confirmDelete.question_id}: ${confirmDelete.prompt.substring(0, 60)}..."? Any user answers to this question will also be deleted. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => handleDeleteQuestion(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={styles.logo}>CD</div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Admin Panel</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            style={{ ...styles.logoutBtn, borderColor: "#3b82f6", color: "#93c5fd" }}
            onClick={() => setShowHelp(true)}
            title="Help"
          >
            ? Help
          </button>
          <a href="/dashboard" style={{ ...styles.logoutBtn, textDecoration: "none" }}>
            User View
          </a>
          <button style={styles.logoutBtn} onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("admin_token"); localStorage.removeItem("impersonating"); router.push("/"); }}>
            Log out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(["dashboard", "users", "activity", "questions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            style={{
              ...styles.tab,
              ...(tab === t ? styles.tabActive : {}),
            }}
          >
            {t === "dashboard" ? "Dashboard" : t === "users" ? "Users" : t === "activity" ? "Activity" : "Questions"}
          </button>
        ))}
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {actionMsg && <p style={styles.success}>{actionMsg}</p>}

      <div style={styles.content}>
        {/* ── Dashboard ── */}
        {tab === "dashboard" && stats && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={styles.h2}>Overview</h2>
              <button style={styles.helpLink} onClick={() => setShowHelp(true)}>
                What do these metrics mean?
              </button>
            </div>
            <div style={styles.statsGrid}>
              <StatCard label="Total Users" value={stats.total_users} />
              <StatCard label="Completed Questionnaire" value={stats.users_completed_questionnaire} />
              <StatCard label="Completion Rate" value={`${stats.completion_rate}%`} />
              <StatCard label="Users with Reports" value={stats.users_with_reports} />
              <StatCard label="Total Answers" value={stats.total_answers} />
              <StatCard label="Total Reports" value={stats.total_reports} />
              <StatCard label="Avg Answers/User" value={stats.avg_answers_per_user} />
              <StatCard label="New (7 days)" value={stats.users_last_7_days} />
              <StatCard label="New (30 days)" value={stats.users_last_30_days} />
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={styles.h2}>Users ({users.length})</h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", flex: "1 1 auto", justifyContent: "flex-end" }}>
                <button style={styles.helpLink} onClick={() => setShowHelp(true)}>
                  Help
                </button>
                <select
                  style={{ ...styles.select, width: "auto" }}
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="user">user</option>
                  <option value="advisor">advisor</option>
                  <option value="admin">admin</option>
                  <option value="auditor">auditor</option>
                </select>
                <input
                  placeholder="Search by email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
            </div>

            {selectedUser ? (
              <div>
                <button style={styles.backBtn} onClick={() => setSelectedUser(null)}>
                  &larr; Back to list
                </button>
                <div style={styles.card}>
                  <h3>{selectedUser.full_name || "No name"}</h3>
                  <p style={styles.muted}>{selectedUser.email}</p>
                  <div style={{ display: "flex", gap: "0.5rem", margin: "0.75rem 0", flexWrap: "wrap" }}>
                    <span style={styles.badge}>Role: {selectedUser.role}</span>
                    <span style={styles.badge}>Answers: {selectedUser.answers_count}</span>
                    <span style={styles.badge}>Reports: {selectedUser.reports_count}</span>
                    <span style={styles.badge}>
                      Questionnaire: {selectedUser.questionnaire_completed ? "Done" : `Module ${selectedUser.current_module || "A"}`}
                    </span>
                    <span style={styles.badge}>Logins: {selectedUser.login_count}</span>
                    <span style={styles.badge}>
                      Last login: {selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : "Never"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                    <select
                      defaultValue={selectedUser.role}
                      onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                      style={styles.select}
                    >
                      <option value="user">user</option>
                      <option value="advisor">advisor</option>
                      <option value="admin">admin</option>
                      <option value="auditor">auditor</option>
                    </select>
                    {selectedUser.questionnaire_completed && (
                      <button style={styles.btnOutline} onClick={() => handleResetQuestionnaire(selectedUser.id)}>
                        Reset Questionnaire
                      </button>
                    )}
                    <button
                      style={{
                        ...styles.btnOutline,
                        borderColor: selectedUser.can_regenerate ? "#059669" : "#6b7280",
                        color: selectedUser.can_regenerate ? "#34d399" : "#9ca3af",
                      }}
                      onClick={() => handleToggleRegenerate(selectedUser.id, !selectedUser.can_regenerate)}
                    >
                      {selectedUser.can_regenerate ? "Regeneration: ON" : "Allow Regeneration"}
                    </button>
                    {selectedUser.has_analysis_report && (
                      <button
                        style={{ ...styles.btnOutline, borderColor: "#8b5cf6", color: "#a78bfa" }}
                        onClick={() => handleViewReport(selectedUser.id)}
                        disabled={reportLoading}
                      >
                        {reportLoading ? "Loading..." : "View Report"}
                      </button>
                    )}
                    {selectedUser.questionnaire_completed && (
                      <button
                        style={{ ...styles.btnOutline, borderColor: "#f59e0b", color: "#fbbf24" }}
                        onClick={() => handleRegenerateSummary(selectedUser.id)}
                      >
                        Regen Summary
                      </button>
                    )}
                    <button
                      style={{ ...styles.btnOutline, borderColor: "#2563eb", color: "#60a5fa" }}
                      onClick={() => handleImpersonate(selectedUser.id, selectedUser.email)}
                    >
                      View as User
                    </button>
                    <button style={styles.btnDanger} onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}>
                      Delete User
                    </button>
                  </div>

                  {/* Report Viewer */}
                  {viewingReport && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h4>Career Analysis Report</h4>
                        <button
                          style={{ ...styles.btnSmall, fontSize: "0.75rem" }}
                          onClick={() => setViewingReport(null)}
                        >
                          Close
                        </button>
                      </div>
                      <div style={{
                        background: "#fff",
                        color: "#171717",
                        borderRadius: "8px",
                        padding: "1.25rem",
                        maxHeight: "500px",
                        overflowY: "auto",
                        fontSize: "0.88rem",
                        lineHeight: "1.7",
                      }}>
                        <div className="markdown-report">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {viewingReport.markdown_report}
                          </ReactMarkdown>
                        </div>
                        <hr style={{ margin: "1rem 0 0.5rem", borderColor: "#e5e7eb" }} />
                        <p style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "center" }}>
                          Generated {new Date(viewingReport.created_at).toLocaleString()} — Model: {viewingReport.model_name}
                        </p>
                      </div>
                    </div>
                  )}

                  <h4 style={{ marginBottom: "0.5rem" }}>Answers ({userAnswers.length})</h4>
                  {userAnswers.length === 0 ? (
                    <p style={styles.muted}>No answers yet.</p>
                  ) : (
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Value</th>
                            <th style={styles.th}>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userAnswers.map((a) => (
                            <tr key={a.question_id}>
                              <td style={styles.td}>{a.question_id}</td>
                              <td style={styles.td}>
                                {Array.isArray(a.value) ? a.value.join(", ") : String(a.value ?? "")}
                              </td>
                              <td style={styles.td}>{a.confidence}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Answers</th>
                      <th style={styles.th}>Last Login</th>
                      <th style={styles.th}>Joined</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>{u.full_name || "\u2014"}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.roleBadge,
                            background: u.role === "admin" ? "#fef3c7" : u.role === "advisor" ? "#dbeafe" : "#f3f4f6",
                            color: u.role === "admin" ? "#92400e" : u.role === "advisor" ? "#1e40af" : "#374151",
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {u.questionnaire_completed ? (
                            <span style={{ color: "#059669" }}>Completed</span>
                          ) : (
                            <span style={styles.muted}>Module {u.current_module || "A"}</span>
                          )}
                        </td>
                        <td style={styles.td}>{u.answers_count}</td>
                        <td style={styles.td}>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "\u2014"}</td>
                        <td style={styles.td}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <button style={styles.btnSmall} onClick={() => handleViewAnswers(u)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Activity ── */}
        {tab === "activity" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={styles.h2}>Activity Log ({activity.length})</h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <button style={styles.helpLink} onClick={() => setShowHelp(true)}>
                  Help
                </button>
                <select
                  style={{ ...styles.select, width: "auto" }}
                  value={activityRoleFilter}
                  onChange={(e) => {
                    setActivityRoleFilter(e.target.value);
                    loadActivity(e.target.value, activityActionFilter, activityDays);
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="user">user</option>
                  <option value="advisor">advisor</option>
                  <option value="admin">admin</option>
                  <option value="auditor">auditor</option>
                </select>
                <select
                  style={{ ...styles.select, width: "auto" }}
                  value={activityActionFilter}
                  onChange={(e) => {
                    setActivityActionFilter(e.target.value);
                    loadActivity(activityRoleFilter, e.target.value, activityDays);
                  }}
                >
                  <option value="">All Actions</option>
                  <option value="login">login</option>
                  <option value="questionnaire_completed">questionnaire_completed</option>
                  <option value="report_generated">report_generated</option>
                </select>
                <select
                  style={{ ...styles.select, width: "auto" }}
                  value={activityDays}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setActivityDays(d);
                    loadActivity(activityRoleFilter, activityActionFilter, d);
                  }}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>
            </div>

            {activity.length === 0 ? (
              <p style={{ ...styles.muted, textAlign: "center", padding: "2rem" }}>
                No activity events found for the selected filters.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Action</th>
                      <th style={styles.th}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((e) => (
                      <tr key={e.id}>
                        <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                          {new Date(e.created_at).toLocaleString()}
                        </td>
                        <td style={styles.td}>{e.user_email}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.roleBadge,
                            background: e.user_role === "admin" ? "#fef3c7" : e.user_role === "advisor" ? "#dbeafe" : "#f3f4f6",
                            color: e.user_role === "admin" ? "#92400e" : e.user_role === "advisor" ? "#1e40af" : "#374151",
                          }}>
                            {e.user_role}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            background: e.action === "login" ? "rgba(34,197,94,0.15)" : e.action === "report_generated" ? "rgba(139,92,246,0.15)" : "rgba(59,130,246,0.15)",
                            color: e.action === "login" ? "#4ade80" : e.action === "report_generated" ? "#a78bfa" : "#60a5fa",
                          }}>
                            {e.action}
                          </span>
                        </td>
                        <td style={styles.td}>{e.detail || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Questions ── */}
        {tab === "questions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={styles.h2}>Questions ({filteredQuestions.length})</h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <button style={styles.helpLink} onClick={() => setShowHelp(true)}>
                  Help
                </button>
                <select
                  style={{ ...styles.select, width: "auto" }}
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                >
                  <option value="all">All Modules</option>
                  {MODULES.map((m) => (
                    <option key={m} value={m}>Module {m}</option>
                  ))}
                </select>
                <input
                  placeholder="Filter by ID or text..."
                  value={questionFilter}
                  onChange={(e) => setQuestionFilter(e.target.value)}
                  style={styles.searchInput}
                />
                <button
                  style={{ ...styles.btnSmall, background: "#2563eb", padding: "0.45rem 1rem" }}
                  onClick={() => setEditingQuestion("new")}
                >
                  + Add Question
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: "60px" }}>Order</th>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Module</th>
                    <th style={{ ...styles.th, minWidth: "280px" }}>Prompt</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Req</th>
                    <th style={styles.th}>Options</th>
                    <th style={styles.th}>Tags</th>
                    <th style={{ ...styles.th, minWidth: "140px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((q, idx) => {
                    // Determine if this question is first/last in its module (for move buttons)
                    const sameModule = filteredQuestions.filter((fq) => fq.module === q.module);
                    const moduleIdx = sameModule.findIndex((fq) => fq.question_id === q.question_id);
                    const isFirst = moduleIdx === 0;
                    const isLast = moduleIdx === sameModule.length - 1;

                    return (
                      <tr key={q.question_id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                        <td style={styles.td}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                            <button
                              style={{ ...styles.iconBtn, opacity: isFirst ? 0.3 : 1 }}
                              onClick={() => !isFirst && handleMoveQuestion(q.question_id, "up")}
                              disabled={isFirst}
                              title="Move up"
                            >
                              &#9650;
                            </button>
                            <button
                              style={{ ...styles.iconBtn, opacity: isLast ? 0.3 : 1 }}
                              onClick={() => !isLast && handleMoveQuestion(q.question_id, "down")}
                              disabled={isLast}
                              title="Move down"
                            >
                              &#9660;
                            </button>
                          </div>
                        </td>
                        <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "0.8rem" }}>{q.question_id}</td>
                        <td style={styles.td}>
                          <span style={styles.moduleBadge}>{q.module}</span>
                        </td>
                        <td style={styles.td}>{q.prompt}</td>
                        <td style={styles.td}>
                          <span style={styles.typeBadge}>{q.question_type}</span>
                        </td>
                        <td style={styles.td}>{q.required ? "Yes" : "No"}</td>
                        <td style={{ ...styles.td, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {q.options_json ? q.options_json.join(", ") : "\u2014"}
                        </td>
                        <td style={{ ...styles.td, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {q.tags_json ? q.tags_json.join(", ") : "\u2014"}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button
                              style={styles.btnSmall}
                              onClick={() => setEditingQuestion(q)}
                              title="Edit question"
                            >
                              Edit
                            </button>
                            <button
                              style={{ ...styles.iconBtn, color: "#ef4444", fontSize: "0.9rem" }}
                              onClick={() => setConfirmDelete(q)}
                              title="Delete question"
                            >
                              &#128465;
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredQuestions.length === 0 && (
              <p style={{ ...styles.muted, textAlign: "center", padding: "2rem" }}>
                No questions match your filters.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.statCard}>
      <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</p>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  page: { background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "2rem", textAlign: "center" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0.75rem 1rem", borderBottom: "1px solid #1e293b",
    flexWrap: "wrap" as const, gap: "0.5rem",
  },
  logo: {
    width: "32px", height: "32px", borderRadius: "7px", background: "#2563eb",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: "0.7rem", color: "white",
  },
  logoutBtn: {
    background: "transparent", border: "1px solid #334155", color: "#f1f5f9",
    padding: "0.4rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem",
  },
  tabs: {
    display: "flex", gap: "0", borderBottom: "1px solid #1e293b",
    padding: "0 1rem", overflowX: "auto" as const,
  },
  tab: {
    background: "transparent", border: "none", color: "#64748b",
    padding: "0.75rem 1rem", cursor: "pointer", fontSize: "0.85rem",
    borderBottom: "2px solid transparent", transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  },
  tabActive: {
    color: "#f1f5f9", borderBottomColor: "#2563eb", fontWeight: 600,
  },
  content: { maxWidth: "1400px", margin: "0 auto", padding: "1rem" },
  h2: { fontSize: "1.25rem", fontWeight: 700, marginBottom: "0" },
  error: { color: "#ef4444", padding: "0.75rem 1rem", fontSize: "0.9rem" },
  success: { color: "#22c55e", padding: "0.75rem 1rem", fontSize: "0.9rem" },
  muted: { color: "#64748b", fontSize: "0.9rem" },
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "0.75rem",
  },
  statCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
    borderRadius: "10px", padding: "1.25rem",
  },
  card: {
    background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
    borderRadius: "10px", padding: "1rem",
  },
  searchInput: {
    background: "#0f172a", border: "1px solid #334155", color: "#f1f5f9",
    padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.85rem",
    width: "100%", maxWidth: "220px", minWidth: "140px",
  },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" },
  th: {
    textAlign: "left" as const, padding: "0.75rem 0.5rem", borderBottom: "1px solid #1e293b",
    color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "0.65rem 0.5rem", borderBottom: "1px solid rgba(30,41,59,0.5)",
    verticalAlign: "top" as const,
  },
  badge: {
    background: "rgba(255,255,255,0.06)", padding: "0.25rem 0.75rem",
    borderRadius: "20px", fontSize: "0.8rem", color: "#94a3b8",
  },
  roleBadge: {
    padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600,
  },
  moduleBadge: {
    background: "#1e3a5f", color: "#93c5fd", padding: "0.2rem 0.5rem",
    borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600,
  },
  typeBadge: {
    background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", padding: "0.2rem 0.5rem",
    borderRadius: "4px", fontSize: "0.72rem", fontFamily: "monospace",
  },
  btnSmall: {
    background: "#1e293b", border: "1px solid #334155", color: "#f1f5f9",
    padding: "0.3rem 0.75rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem",
  },
  btnOutline: {
    background: "transparent", border: "1px solid #334155", color: "#f1f5f9",
    padding: "0.4rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem",
  },
  btnDanger: {
    background: "transparent", border: "1px solid #dc2626", color: "#dc2626",
    padding: "0.4rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem",
  },
  iconBtn: {
    background: "transparent", border: "none", color: "#94a3b8",
    cursor: "pointer", fontSize: "0.7rem", padding: "2px 4px", lineHeight: 1,
  },
  backBtn: {
    background: "transparent", border: "none", color: "#60a5fa",
    cursor: "pointer", fontSize: "0.9rem", padding: "0", marginBottom: "1rem",
  },
  select: {
    background: "#0f172a", border: "1px solid #334155", color: "#f1f5f9",
    padding: "0.4rem 0.75rem", borderRadius: "8px", fontSize: "0.85rem",
  },
  helpLink: {
    background: "transparent", border: "none", color: "#60a5fa",
    cursor: "pointer", fontSize: "0.82rem", padding: "0", textDecoration: "underline",
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "1rem",
  },
  modal: {
    background: "#111827", border: "1px solid #1e293b", borderRadius: "12px",
    maxWidth: "650px", width: "100%", maxHeight: "80vh", display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "1rem 1.5rem", borderBottom: "1px solid #1e293b",
  },
  closeBtn: {
    background: "transparent", border: "none", color: "#94a3b8",
    cursor: "pointer", fontSize: "1rem", padding: "0.25rem",
  },
  body: {
    padding: "1.25rem 1.5rem", overflowY: "auto",
  },
};

const fieldStyles: Record<string, React.CSSProperties> = {
  group: { marginBottom: "1rem" },
  label: { display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 500 },
  input: {
    width: "100%", background: "#0f172a", border: "1px solid #334155",
    color: "#f1f5f9", padding: "0.5rem 0.75rem", borderRadius: "8px",
    fontSize: "0.88rem", boxSizing: "border-box" as const,
  },
  select: {
    width: "100%", background: "#0f172a", border: "1px solid #334155",
    color: "#f1f5f9", padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.88rem",
  },
  hint: { fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" },
};
