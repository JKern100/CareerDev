"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getMe,
  sendCoachMessage,
  getCoachHistory,
  clearCoachHistory,
  getCoachGoals,
  createCoachGoal,
  updateCoachGoal,
  deleteCoachGoal,
  CoachMessage,
  CoachGoal,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import FlowerSpinner from "@/components/FlowerSpinner";

export default function CoachPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [goals, setGoals] = useState<CoachGoal[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDate, setNewGoalDate] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        await getMe();
        const [history, userGoals] = await Promise.all([
          getCoachHistory(),
          getCoachGoals(),
        ]);
        setMessages(history);
        setGoals(userGoals);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    // Optimistically add user message
    const tempUserMsg: CoachMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const { reply } = await sendCoachMessage(text);
      const assistantMsg: CoachMessage = {
        id: `temp-${Date.now()}-reply`,
        role: "assistant",
        content: reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg: CoachMessage = {
        id: `temp-${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, I couldn't process that right now. Please try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleClearHistory() {
    if (!confirm("Clear all chat history? This cannot be undone.")) return;
    try {
      await clearCoachHistory();
      setMessages([]);
    } catch {}
  }

  async function handleAddGoal() {
    if (!newGoalTitle.trim()) return;
    try {
      const goal = await createCoachGoal(newGoalTitle.trim(), newGoalDate || undefined);
      setGoals((prev) => [goal, ...prev]);
      setNewGoalTitle("");
      setNewGoalDate("");
    } catch {}
  }

  async function handleToggleGoal(goal: CoachGoal) {
    try {
      const updated = await updateCoachGoal(goal.id, { completed: !goal.completed });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch {}
  }

  async function handleDeleteGoal(goalId: string) {
    try {
      await deleteCoachGoal(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch {}
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <AppHeader />
        <div style={styles.center}>
          <FlowerSpinner size={48} />
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  return (
    <div style={styles.page}>
      <AppHeader />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Career Coach</h1>
            <p style={styles.subtitle}>
              Your AI career advisor — powered by your questionnaire data and career analysis.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setShowGoals(!showGoals)}
              style={{
                ...styles.headerBtn,
                background: showGoals ? "rgba(234, 179, 8, 0.15)" : "rgba(255,255,255,0.05)",
                borderColor: showGoals ? "rgba(234, 179, 8, 0.4)" : "#334155",
                color: showGoals ? "#facc15" : "#94a3b8",
              }}
            >
              Goals ({activeGoals.length})
            </button>
            {messages.length > 0 && (
              <button onClick={handleClearHistory} style={styles.headerBtn}>
                Clear Chat
              </button>
            )}
          </div>
        </div>

        <div style={styles.layout}>
          {/* Goals Panel */}
          {showGoals && (
            <div style={styles.goalsPanel}>
              <h3 style={styles.goalsPanelTitle}>Career Goals</h3>

              {/* Add goal form */}
              <div style={styles.addGoalForm}>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Add a new goal..."
                  style={styles.goalInput}
                  onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                />
                <input
                  type="date"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  style={styles.goalDateInput}
                />
                <button onClick={handleAddGoal} style={styles.addGoalBtn}>
                  Add
                </button>
              </div>

              {/* Active goals */}
              {activeGoals.length === 0 && completedGoals.length === 0 && (
                <p style={styles.noGoals}>
                  No goals yet. Set career goals to track your progress.
                </p>
              )}
              {activeGoals.map((goal) => (
                <div key={goal.id} style={styles.goalItem}>
                  <button
                    onClick={() => handleToggleGoal(goal)}
                    style={styles.goalCheckbox}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={styles.goalTitle}>{goal.title}</span>
                    {goal.target_date && (
                      <span style={styles.goalDate}>Due: {goal.target_date}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    style={styles.goalDeleteBtn}
                  >
                    x
                  </button>
                </div>
              ))}

              {/* Completed goals */}
              {completedGoals.length > 0 && (
                <>
                  <p style={styles.completedLabel}>Completed ({completedGoals.length})</p>
                  {completedGoals.map((goal) => (
                    <div key={goal.id} style={{ ...styles.goalItem, opacity: 0.5 }}>
                      <button
                        onClick={() => handleToggleGoal(goal)}
                        style={{ ...styles.goalCheckbox, background: "#22c55e", borderColor: "#22c55e" }}
                      />
                      <span style={{ ...styles.goalTitle, textDecoration: "line-through" }}>
                        {goal.title}
                      </span>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        style={styles.goalDeleteBtn}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Chat Area */}
          <div style={styles.chatArea}>
            <div style={styles.messagesContainer}>
              {messages.length === 0 && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>?</div>
                  <h2 style={styles.emptyTitle}>Start a conversation</h2>
                  <p style={styles.emptyText}>
                    Ask me anything about your career transition — interview prep,
                    resume tips, salary negotiation, skill gaps, or just talk through
                    your next move.
                  </p>
                  <div style={styles.suggestionsGrid}>
                    {[
                      "What are my strongest transferable skills?",
                      "Help me prepare for a product manager interview",
                      "Review my career analysis — what should I focus on first?",
                      "What salary should I target in my top pathway?",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        style={styles.suggestionBtn}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.messageBubble,
                    ...(msg.role === "user" ? styles.userBubble : styles.assistantBubble),
                  }}
                >
                  <div style={styles.messageRole}>
                    {msg.role === "user" ? "You" : "Coach"}
                  </div>
                  {msg.role === "assistant" ? (
                    <div style={styles.markdownContent}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div style={styles.messageText}>{msg.content}</div>
                  )}
                </div>
              ))}

              {sending && (
                <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                  <div style={styles.messageRole}>Coach</div>
                  <div style={styles.typing}>
                    <FlowerSpinner size={20} />
                    <span style={{ marginLeft: "0.5rem", color: "#64748b" }}>Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={styles.inputArea}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your career coach anything..."
                style={styles.textarea}
                rows={1}
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  ...styles.sendBtn,
                  opacity: !input.trim() || sending ? 0.4 : 1,
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#0a0e1a",
    color: "#f1f5f9",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1rem 1rem",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "1rem 0",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    marginBottom: "0.25rem",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "0.9rem",
  },
  headerBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid #334155",
    color: "#94a3b8",
    padding: "0.4rem 0.9rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
  },
  layout: {
    display: "flex",
    gap: "1rem",
    flex: 1,
    minHeight: 0,
  },
  // Goals Panel
  goalsPanel: {
    width: "300px",
    flexShrink: 0,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "1rem",
    overflowY: "auto",
    maxHeight: "calc(100vh - 200px)",
  },
  goalsPanelTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
    color: "#facc15",
  },
  addGoalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginBottom: "1rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #1e293b",
  },
  goalInput: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "0.5rem 0.75rem",
    color: "#f1f5f9",
    fontSize: "0.85rem",
    outline: "none",
  },
  goalDateInput: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "0.4rem 0.75rem",
    color: "#94a3b8",
    fontSize: "0.82rem",
    outline: "none",
    colorScheme: "dark",
  },
  addGoalBtn: {
    background: "rgba(234, 179, 8, 0.15)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    color: "#facc15",
    padding: "0.4rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  noGoals: {
    color: "#475569",
    fontSize: "0.85rem",
    textAlign: "center",
    padding: "1rem 0",
  },
  goalItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
    padding: "0.5rem 0",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  goalCheckbox: {
    width: "18px",
    height: "18px",
    minWidth: "18px",
    borderRadius: "4px",
    border: "2px solid #475569",
    background: "transparent",
    cursor: "pointer",
    marginTop: "2px",
  },
  goalTitle: {
    fontSize: "0.85rem",
    color: "#e2e8f0",
    display: "block",
  },
  goalDate: {
    fontSize: "0.75rem",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },
  goalDeleteBtn: {
    background: "none",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    fontSize: "0.85rem",
    padding: "0 4px",
  },
  completedLabel: {
    fontSize: "0.8rem",
    color: "#475569",
    marginTop: "0.75rem",
    marginBottom: "0.25rem",
  },
  // Chat Area
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    overflow: "hidden",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    maxHeight: "calc(100vh - 280px)",
  },
  // Empty state
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: "2rem",
    textAlign: "center",
  },
  emptyIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    color: "#60a5fa",
    marginBottom: "1rem",
  },
  emptyTitle: {
    fontSize: "1.2rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
  },
  emptyText: {
    color: "#64748b",
    fontSize: "0.9rem",
    maxWidth: "500px",
    lineHeight: 1.6,
    marginBottom: "1.5rem",
  },
  suggestionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.5rem",
    maxWidth: "600px",
    width: "100%",
  },
  suggestionBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid #1e293b",
    borderRadius: "10px",
    padding: "0.75rem",
    color: "#94a3b8",
    fontSize: "0.82rem",
    cursor: "pointer",
    textAlign: "left",
    lineHeight: 1.4,
    transition: "border-color 0.15s",
  },
  // Messages
  messageBubble: {
    maxWidth: "85%",
    padding: "0.75rem 1rem",
    borderRadius: "12px",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.25)",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid #1e293b",
  },
  messageRole: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: "0.3rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  messageText: {
    fontSize: "0.9rem",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  markdownContent: {
    fontSize: "0.9rem",
    lineHeight: 1.6,
  },
  typing: {
    display: "flex",
    alignItems: "center",
    padding: "0.25rem 0",
  },
  // Input
  inputArea: {
    display: "flex",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    borderTop: "1px solid #1e293b",
    background: "rgba(0,0,0,0.2)",
  },
  textarea: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "0.65rem 0.9rem",
    color: "#f1f5f9",
    fontSize: "0.9rem",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.5,
    minHeight: "42px",
    maxHeight: "120px",
  },
  sendBtn: {
    background: "#2563eb",
    border: "none",
    color: "white",
    padding: "0.6rem 1.2rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.88rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    alignSelf: "flex-end",
  },
};
