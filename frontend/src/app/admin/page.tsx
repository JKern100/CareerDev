"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe,
  getAdminStats,
  getAdminUsers,
  getAdminQuestions,
  updateAdminUser,
  deleteAdminUser,
  updateAdminQuestion,
  getUserAnswers,
  DashboardStats,
  AdminUser,
  AdminQuestion,
  UserAnswer,
} from "@/lib/api";

type Tab = "dashboard" | "users" | "questions";

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

  // Questions
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [questionFilter, setQuestionFilter] = useState("");

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

  async function loadQuestions() {
    setLoading(true);
    try {
      const q = await getAdminQuestions();
      setQuestions(q);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }

  async function handleTabChange(t: Tab) {
    setTab(t);
    setError("");
    setActionMsg("");
    setSelectedUser(null);
    if (t === "dashboard") await loadDashboard();
    if (t === "users") await loadUsers();
    if (t === "questions") await loadQuestions();
  }

  async function handleViewAnswers(user: AdminUser) {
    setSelectedUser(user);
    try {
      const a = await getUserAnswers(user.id);
      setUserAnswers(a);
    } catch {
      setUserAnswers([]);
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

  async function handleSaveQuestion(questionId: string) {
    try {
      await updateAdminQuestion(questionId, { prompt: editPrompt });
      setActionMsg("Question updated");
      setEditingQuestion(null);
      await loadQuestions();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredQuestions = questions.filter(
    (q) =>
      q.question_id.toLowerCase().includes(questionFilter.toLowerCase()) ||
      q.prompt.toLowerCase().includes(questionFilter.toLowerCase()) ||
      q.module.toLowerCase().includes(questionFilter.toLowerCase())
  );

  if (loading && !stats && users.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={styles.logo}>CD</div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Admin Panel</span>
        </div>
        <button style={styles.logoutBtn} onClick={() => { localStorage.removeItem("token"); router.push("/"); }}>
          Log out
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(["dashboard", "users", "questions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            style={{
              ...styles.tab,
              ...(tab === t ? styles.tabActive : {}),
            }}
          >
            {t === "dashboard" ? "Dashboard" : t === "users" ? "Users" : "Questions"}
          </button>
        ))}
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {actionMsg && <p style={styles.success}>{actionMsg}</p>}

      <div style={styles.content}>
        {/* ── Dashboard ── */}
        {tab === "dashboard" && stats && (
          <div>
            <h2 style={styles.h2}>Overview</h2>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={styles.h2}>Users ({users.length})</h2>
              <input
                placeholder="Search by email or name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {selectedUser ? (
              <div>
                <button style={styles.backBtn} onClick={() => setSelectedUser(null)}>
                  &larr; Back to list
                </button>
                <div style={styles.card}>
                  <h3>{selectedUser.full_name || "No name"}</h3>
                  <p style={styles.muted}>{selectedUser.email}</p>
                  <div style={{ display: "flex", gap: "1rem", margin: "1rem 0", flexWrap: "wrap" }}>
                    <span style={styles.badge}>Role: {selectedUser.role}</span>
                    <span style={styles.badge}>Answers: {selectedUser.answers_count}</span>
                    <span style={styles.badge}>Reports: {selectedUser.reports_count}</span>
                    <span style={styles.badge}>
                      Questionnaire: {selectedUser.questionnaire_completed ? "Done" : `Module ${selectedUser.current_module || "A"}`}
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
                    <button style={styles.btnDanger} onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}>
                      Delete User
                    </button>
                  </div>

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
                      <th style={styles.th}>Joined</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>{u.full_name || "—"}</td>
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

        {/* ── Questions ── */}
        {tab === "questions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={styles.h2}>Questions ({questions.length})</h2>
              <input
                placeholder="Filter by ID, module, or text..."
                value={questionFilter}
                onChange={(e) => setQuestionFilter(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Module</th>
                    <th style={{ ...styles.th, minWidth: "300px" }}>Prompt</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Required</th>
                    <th style={styles.th}>Options</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((q) => (
                    <tr key={q.question_id}>
                      <td style={styles.td}>{q.question_id}</td>
                      <td style={styles.td}>{q.module}</td>
                      <td style={styles.td}>
                        {editingQuestion === q.question_id ? (
                          <input
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            style={{ ...styles.searchInput, width: "100%" }}
                          />
                        ) : (
                          q.prompt
                        )}
                      </td>
                      <td style={styles.td}>{q.question_type}</td>
                      <td style={styles.td}>{q.required ? "Yes" : "No"}</td>
                      <td style={styles.td}>
                        {q.options_json ? q.options_json.join(", ") : "—"}
                      </td>
                      <td style={styles.td}>
                        {editingQuestion === q.question_id ? (
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button style={styles.btnSmall} onClick={() => handleSaveQuestion(q.question_id)}>Save</button>
                            <button style={styles.btnSmall} onClick={() => setEditingQuestion(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button
                            style={styles.btnSmall}
                            onClick={() => { setEditingQuestion(q.question_id); setEditPrompt(q.prompt); }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

const styles: Record<string, React.CSSProperties> = {
  page: { background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "2rem", textAlign: "center" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "1rem 2rem", borderBottom: "1px solid #1e293b",
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
    padding: "0 2rem",
  },
  tab: {
    background: "transparent", border: "none", color: "#64748b",
    padding: "0.75rem 1.5rem", cursor: "pointer", fontSize: "0.9rem",
    borderBottom: "2px solid transparent", transition: "all 0.15s",
  },
  tabActive: {
    color: "#f1f5f9", borderBottomColor: "#2563eb", fontWeight: 600,
  },
  content: { maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2rem" },
  h2: { fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" },
  error: { color: "#ef4444", padding: "0.75rem 2rem", fontSize: "0.9rem" },
  success: { color: "#22c55e", padding: "0.75rem 2rem", fontSize: "0.9rem" },
  muted: { color: "#64748b", fontSize: "0.9rem" },
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1rem",
  },
  statCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
    borderRadius: "10px", padding: "1.25rem",
  },
  card: {
    background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
    borderRadius: "10px", padding: "1.5rem",
  },
  searchInput: {
    background: "#0f172a", border: "1px solid #334155", color: "#f1f5f9",
    padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.85rem", width: "250px",
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
  backBtn: {
    background: "transparent", border: "none", color: "#60a5fa",
    cursor: "pointer", fontSize: "0.9rem", padding: "0", marginBottom: "1rem",
  },
  select: {
    background: "#0f172a", border: "1px solid #334155", color: "#f1f5f9",
    padding: "0.4rem 0.75rem", borderRadius: "8px", fontSize: "0.85rem",
  },
};
