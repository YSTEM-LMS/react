import React, { useState, useEffect, useRef } from "react";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router";
import { SetPermissionLevel } from "../../globals";
import { environment } from "../../environments";
import userPortraitImg from "../../assets/images/user-portrait-placeholder.svg";

interface Template {
  _id?: string;
  name: string;
  ageGroup: 'elementary' | 'middle' | 'high' | 'general';
  topic: string;
  systemPrompt: string;
  isEnabled: boolean;
}

interface GuardrailData {
  keywords: string[];
  responseMessage: string;
}

const AdminProfile = () => {
  const [cookies, , removeCookie] = useCookies(["login", "eventId", "timerStatus"]);
  const navigate = useNavigate();

  // Active sub-dashboard tab
  const [activeTab, setActiveTab] = useState<"sessions" | "topics" | "guardrails" | "observability">("sessions");

  // User info
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");

  // Sessions list (Educator Dashboard)
  const [sessions, setSessions] = useState<any[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [studentSearch, setStudentSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("All Topics");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dashboardPage, setDashboardPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<any[]>([]);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);

  // Topics/Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Template>({
    name: "",
    ageGroup: "general",
    topic: "",
    systemPrompt: "",
    isEnabled: true
  });

  // Guardrails state
  const [guardrail, setGuardrail] = useState<GuardrailData>({
    keywords: [],
    responseMessage: ""
  });
  const [guardrailInput, setGuardrailInput] = useState("");
  const [guardrailMessage, setGuardrailMessage] = useState("");
  const [isSavingGuardrail, setIsSavingGuardrail] = useState(false);

  // Observability & Metrics state
  const [metrics, setMetrics] = useState<any>({
    totalRequests: 0,
    totalEscalations: 0,
    totalErrors: 0,
    totalLlmCalls: 0,
    averageLatencyMs: 0
  });
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (activeTab === "sessions") {
      fetchSessions();
    } else if (activeTab === "topics") {
      fetchTemplates();
    } else if (activeTab === "guardrails") {
      fetchGuardrails();
    } else if (activeTab === "observability") {
      fetchMetrics();
      fetchSystemLogs();
    }
  }, [activeTab, topicFilter, studentSearch, startDate, endDate, dashboardPage]);

  const checkAuth = async () => {
    const uInfo = await SetPermissionLevel(cookies, removeCookie);
    if (uInfo.error) {
      navigate("/login");
    } else {
      if (uInfo.role !== "admin" && uInfo.role !== "tutor") {
        navigate(`/${uInfo.role}-profile`);
      } else {
        setUsername(uInfo.username);
        setFirstName(uInfo.firstName);
        setLastName(uInfo.lastName);
        setRole(uInfo.role);
      }
    }
  };

  // ==========================================
  // SESSIONS (Logs)
  // ==========================================
  const fetchSessions = () => {
    const limit = 10;
    const skip = (dashboardPage - 1) * limit;
    let url = `${environment.urls.middlewareURL}/chat/educator/sessions?skip=${skip}&limit=${limit}`;
    if (topicFilter && topicFilter !== "All Topics") {
      url += `&topic=${encodeURIComponent(topicFilter)}`;
    }
    if (studentSearch) {
      url += `&student=${encodeURIComponent(studentSearch)}`;
    }
    if (startDate) {
      url += `&startDate=${encodeURIComponent(startDate)}`;
    }
    if (endDate) {
      url += `&endDate=${encodeURIComponent(endDate)}`;
    }

    fetch(url, {
      headers: { "Authorization": `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.sessions) {
          setSessions(data.sessions);
          setTotalSessions(data.total);
        }
      })
      .catch(err => console.error("Error fetching educator sessions:", err));
  };

  const handleViewTranscript = (sessionId: string, session: any) => {
    fetch(`${environment.urls.middlewareURL}/chat/educator/session/${sessionId}/transcript`, {
      headers: { "Authorization": `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          setSelectedTranscript(data.messages);
          setSelectedSession(session);
          setIsTranscriptModalOpen(true);
        }
      })
      .catch(err => console.error("Error fetching transcript:", err));
  };

  const handleCopyLMS = (session: any) => {
    const text = `STUDENT: ${session.userId ? `${session.userId.firstName} ${session.userId.lastName} (${session.userId.username})` : 'Unknown'}
DATE: ${new Date(session.createdAt).toLocaleDateString()}
TOPIC: ${session.topic}
SUMMARY: ${session.summary || 'N/A'}
ACTION ITEMS:
${session.actions && session.actions.length > 0 ? session.actions.map((act: any, idx: any) => `${idx + 1}. ${act}`).join('\n') : 'None'}`;
    
    navigator.clipboard.writeText(text)
      .then(() => alert("Session summary successfully copied to clipboard for LMS/CRM import!"))
      .catch(err => console.error("Failed to copy summary:", err));
  };

  // ==========================================
  // TOPICS (Templates)
  // ==========================================
  const fetchTemplates = () => {
    fetch(`${environment.urls.middlewareURL}/chat/templates`, {
      headers: { "Authorization": `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.templates) {
          setTemplates(data.templates);
        }
      })
      .catch(err => console.error("Error fetching templates:", err));
  };

  const handleOpenTemplateForm = (template: Template | null = null) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({ ...template });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: "",
        ageGroup: "general",
        topic: "",
        systemPrompt: "",
        isEnabled: true
      });
    }
    setIsTemplateFormOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingTemplate?._id;
    const url = isEdit
      ? `${environment.urls.middlewareURL}/chat/templates/${editingTemplate?._id}`
      : `${environment.urls.middlewareURL}/chat/templates`;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cookies.login}`
        },
        body: JSON.stringify(templateForm)
      });
      if (res.ok) {
        setIsTemplateFormOpen(false);
        fetchTemplates();
        alert(`Topic template successfully ${isEdit ? 'updated' : 'created'}!`);
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || 'Failed to save template'}`);
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred while saving.");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this topic template?")) return;
    try {
      const res = await fetch(`${environment.urls.middlewareURL}/chat/templates/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${cookies.login}` }
      });
      if (res.ok) {
        fetchTemplates();
        alert("Topic template deleted successfully.");
      } else {
        alert("Failed to delete topic template.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // GUARDRAILS
  // ==========================================
  const fetchGuardrails = () => {
    fetch(`${environment.urls.middlewareURL}/chat/guardrails`, {
      headers: { "Authorization": `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.guardrail) {
          setGuardrail(data.guardrail);
          setGuardrailInput(data.guardrail.keywords.join(", "));
        }
      })
      .catch(err => console.error("Error fetching guardrails:", err));
  };

  const handleSaveGuardrail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGuardrail(true);
    setGuardrailMessage("");
    
    // Parse keywords comma list
    const parsedKeywords = guardrailInput
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    try {
      const res = await fetch(`${environment.urls.middlewareURL}/chat/guardrails`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cookies.login}`
        },
        body: JSON.stringify({
          keywords: parsedKeywords,
          responseMessage: guardrail.responseMessage
        })
      });
      if (res.ok) {
        setGuardrailMessage("✓ Guardrail settings updated successfully!");
        fetchGuardrails();
      } else {
        setGuardrailMessage("❌ Failed to update guardrails configuration.");
      }
    } catch (err) {
      console.error(err);
      setGuardrailMessage("❌ An error occurred during saving.");
    } finally {
      setIsSavingGuardrail(false);
    }
  };

  // ==========================================
  // OBSERVABILITY & METRICS
  // ==========================================
  const fetchMetrics = () => {
    fetch(`${environment.urls.middlewareURL}/chat/metrics`, {
      headers: { "Authorization": `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) setMetrics(data);
      })
      .catch(err => console.error("Error fetching metrics:", err));
  };

  const fetchSystemLogs = () => {
    setIsLoadingLogs(true);
    fetch(`${environment.urls.middlewareURL}/chat/educator/logs`, {
      headers: { "Authorization": `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.logs) {
          setSystemLogs(data.logs);
        }
      })
      .catch(err => console.error("Error fetching system logs:", err))
      .finally(() => setIsLoadingLogs(false));
  };

  const logout = () => {
    removeCookie("login");
    removeCookie("eventId");
    removeCookie("timerStatus");
    window.location.pathname = "/login";
  };

  return (
    <main className="bg-slate-50 min-h-screen relative font-sans text-slate-800">
      {/* Premium Admin Header */}
      <section className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-12 px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <img className="w-12 h-12 object-contain" src={userPortraitImg} alt="Profile" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Hello, {firstName || "Educator"}!
              </h1>
              <p className="text-emerald-100 font-medium capitalize mt-1">
                Role: {role || "Tutor"} | Username: {username}
              </p>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-200 border border-white/20 text-white font-bold py-2.5 px-6 rounded-xl backdrop-blur-md shadow-sm"
          >
            Log Out
          </button>
        </div>
      </section>

      {/* Main Admin Dashboard Workspace */}
      <section className="max-w-7xl mx-auto my-8 px-6">
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200 grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[650px]">
          {/* Navigation Sidebar */}
          <nav className="bg-slate-100 border-r border-slate-200 p-6 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-slate-400 uppercase font-black tracking-wider text-xs px-3 mb-4">
                AI Coach Controls
              </div>
              
              <button
                onClick={() => setActiveTab("sessions")}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold transition-all ${
                  activeTab === "sessions" 
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/25" 
                    : "hover:bg-slate-200 text-slate-600"
                }`}
              >
                <span>💬</span> Session Logs
              </button>

              <button
                onClick={() => setActiveTab("topics")}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold transition-all ${
                  activeTab === "topics" 
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/25" 
                    : "hover:bg-slate-200 text-slate-600"
                }`}
              >
                <span>📚</span> Configure Topics
              </button>

              <button
                onClick={() => setActiveTab("guardrails")}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold transition-all ${
                  activeTab === "guardrails" 
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/25" 
                    : "hover:bg-slate-200 text-slate-600"
                }`}
              >
                <span>🛡️</span> Guardrails
              </button>

              <button
                onClick={() => setActiveTab("observability")}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold transition-all ${
                  activeTab === "observability" 
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/25" 
                    : "hover:bg-slate-200 text-slate-600"
                }`}
              >
                <span>📊</span> System logs & metrics
              </button>
            </div>
            
            <div className="bg-slate-200/50 rounded-xl p-4 text-xs text-slate-500 font-medium">
              <span className="font-bold text-teal-700 block mb-1">AI Assistant Coach</span>
              Configure system prompts, topic mapping, safety filters, and audit logs.
            </div>
          </nav>

          {/* Tab Contents Area */}
          <div className="p-8 overflow-y-auto">
            {activeTab === "sessions" && (
              <div>
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">Student Coaching Sessions</h2>
                    <p className="text-sm text-slate-500 mt-1">Review student conversation history and commit summaries</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 p-5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex flex-col gap-1 min-w-[200px] flex-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase">Search Student</label>
                    <input 
                      type="text"
                      placeholder="Username, first name..."
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                      value={studentSearch}
                      onChange={(e) => { setStudentSearch(e.target.value); setDashboardPage(1); }}
                    />
                  </div>

                  <div className="flex flex-col gap-1 min-w-[150px]">
                    <label className="text-[11px] font-black text-slate-500 uppercase">Topic</label>
                    <select
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none cursor-pointer"
                      value={topicFilter}
                      onChange={(e) => { setTopicFilter(e.target.value); setDashboardPage(1); }}
                    >
                      <option>All Topics</option>
                      <option>growth mindset</option>
                      <option>time management</option>
                      <option>dealing with frustration</option>
                      <option>goal-setting</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase">Start Date</label>
                    <input 
                      type="date"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setDashboardPage(1); }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase">End Date</label>
                    <input 
                      type="date"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setDashboardPage(1); }}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Student</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Topic</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Summary</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Escalated?</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">No coaching sessions found.</td>
                        </tr>
                      ) : (
                        sessions.map((s) => (
                          <tr 
                            key={s._id} 
                            onClick={() => handleViewTranscript(s._id, s)}
                            className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                          >
                            <td className="p-4 text-sm font-bold text-slate-800">
                              {s.userId ? `${s.userId.firstName} ${s.userId.lastName} (${s.userId.username})` : 'Unknown'}
                            </td>
                            <td className="p-4 text-sm text-slate-600 capitalize">{s.topic}</td>
                            <td className="p-4 text-sm text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 text-sm text-slate-600 max-w-[220px] truncate">{s.summary || 'N/A'}</td>
                            <td className="p-4 text-sm">
                              {s.escalated ? (
                                <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-xs font-bold">⚠️ Yes</span>
                              ) : (
                                <span className="text-slate-400 text-xs font-bold">No</span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleCopyLMS(s)}
                                className="inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold py-1.5 px-3.5 rounded-lg text-xs transition-colors"
                              >
                                Copy 📋
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalSessions > 10 && (
                  <div className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <button
                      className="px-4.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                      disabled={dashboardPage === 1}
                      onClick={() => setDashboardPage(prev => prev - 1)}
                    >
                      ◀ Previous
                    </button>
                    <span className="text-xs font-bold text-slate-500">
                      Page {dashboardPage} of {Math.ceil(totalSessions / 10)}
                    </span>
                    <button
                      className="px-4.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                      disabled={dashboardPage * 10 >= totalSessions}
                      onClick={() => setDashboardPage(prev => prev + 1)}
                    >
                      Next ▶
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "topics" && (
              <div>
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">Coaching Topic Templates</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure individual AI Coach personalities and system prompts</p>
                  </div>
                  <button
                    onClick={() => handleOpenTemplateForm()}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-xl text-sm shadow-md transition-colors"
                  >
                    + Create Topic
                  </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {templates.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-slate-400">No topic templates configured.</div>
                  ) : (
                    templates.map((t) => (
                      <div key={t._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <h3 className="font-extrabold text-lg text-slate-800">{t.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              t.isEnabled ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}>
                              {t.isEnabled ? "Active" : "Disabled"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                            Topic: <span className="text-teal-600">{t.topic}</span> | Age: <span className="text-slate-600 capitalize">{t.ageGroup}</span>
                          </p>
                          <p className="text-sm text-slate-600 line-clamp-4 italic mb-6">
                            "{t.systemPrompt}"
                          </p>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                          <button
                            onClick={() => handleOpenTemplateForm(t)}
                            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded-lg transition-colors"
                          >
                            Edit ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(t._id!)}
                            className="text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-4 rounded-lg transition-colors"
                          >
                            Delete 🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "guardrails" && (
              <div>
                <div className="mb-6 pb-2 border-b border-slate-100">
                  <h2 className="text-2xl font-extrabold text-slate-800">Safety Guardrails</h2>
                  <p className="text-sm text-slate-500 mt-1">Manage crisis triggers and customized supportive responses</p>
                </div>

                <form onSubmit={handleSaveGuardrail} className="max-w-3xl space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="font-extrabold text-slate-700 text-sm">Crisis Filter Keywords</label>
                    <p className="text-xs text-slate-500">Provide a comma-separated list of keywords that trigger the crisis guardrail redirection.</p>
                    <textarea
                      rows={5}
                      className="w-full p-4 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                      value={guardrailInput}
                      onChange={(e) => setGuardrailInput(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-extrabold text-slate-700 text-sm">Redirection Message</label>
                    <p className="text-xs text-slate-500">Support message shown to the student when a safety keyword is detected. The session terminates immediately to preserve safety.</p>
                    <textarea
                      rows={5}
                      className="w-full p-4 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      value={guardrail.responseMessage}
                      onChange={(e) => setGuardrail({ ...guardrail, responseMessage: e.target.value })}
                    />
                  </div>

                  {guardrailMessage && (
                    <div className={`p-4 rounded-xl text-sm font-bold ${
                      guardrailMessage.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {guardrailMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingGuardrail}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-colors"
                  >
                    {isSavingGuardrail ? "Saving Settings..." : "Save Guardrail Settings"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "observability" && (
              <div>
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">System Logs & Metrics</h2>
                    <p className="text-sm text-slate-500 mt-1">Real-time LLM API observability metrics and request logs</p>
                  </div>
                  <button
                    onClick={() => { fetchMetrics(); fetchSystemLogs(); }}
                    className="text-sm font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 py-2 px-4 rounded-xl transition-colors"
                  >
                    Refresh 🔄
                  </button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Requests</span>
                    <strong className="text-2xl text-slate-800 mt-1 block">{metrics.totalRequests}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">LLM API Calls</span>
                    <strong className="text-2xl text-slate-800 mt-1 block">{metrics.totalLlmCalls}</strong>
                  </div>
                  <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-red-500/80 uppercase tracking-wider block">Escalations</span>
                    <strong className="text-2xl text-red-600 mt-1 block">{metrics.totalEscalations}</strong>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-wider block">Errors</span>
                    <strong className="text-2xl text-amber-600 mt-1 block">{metrics.totalErrors}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Avg Latency</span>
                    <strong className="text-2xl text-slate-800 mt-1 block">{metrics.averageLatencyMs} ms</strong>
                  </div>
                </div>

                {/* Logs Viewer */}
                <div>
                  <h3 className="font-extrabold text-slate-700 mb-3 text-sm">System Logs (llm.log)</h3>
                  <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono text-xs overflow-y-auto max-h-[500px] border border-slate-950 shadow-inner">
                    {isLoadingLogs ? (
                      <div className="text-center py-12 text-slate-500">Loading system log files...</div>
                    ) : systemLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">No logs found in llm.log.</div>
                    ) : (
                      <div className="space-y-2">
                        {systemLogs.map((log, idx) => (
                          <div key={idx} className="border-b border-slate-800/80 pb-2">
                            <span className="text-teal-400">[{log.timestamp}]</span>{" "}
                            {log.type === "escalation" ? (
                              <span className="text-red-400 font-bold">[ESCALATION]</span>
                            ) : (
                              <span className="text-sky-400">[LLM_CALL]</span>
                            )}{" "}
                            <span className="text-emerald-400">Session:</span> {log.sessionId}{" "}
                            {log.model && <>|<span className="text-slate-400"> Model:</span> {log.model}</>}{" "}
                            {log.latencyMs && <>|<span className="text-slate-400"> Latency:</span> {log.latencyMs}ms</>}{" "}
                            <span className="text-amber-400">Status:</span> {log.status}{" "}
                            {log.error && <div className="text-red-500 mt-1 ml-4">Error: {log.error}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Edit/Create Topic Modal */}
      {isTemplateFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-teal-700 text-white p-5 flex justify-between items-center border-b border-teal-800">
              <h2 className="font-extrabold text-lg">
                {editingTemplate ? "Edit Topic Template" : "Create Topic Template"}
              </h2>
              <button 
                onClick={() => setIsTemplateFormOpen(false)}
                className="text-white hover:text-teal-200 text-2xl font-bold line-height-1 outline-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Template Name</label>
                  <input
                    type="text"
                    required
                    className="px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="e.g. Growth Mindset (Middle School)"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Topic Trigger (Lowercase)</label>
                  <input
                    type="text"
                    required
                    className="px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="e.g. growth mindset"
                    value={templateForm.topic}
                    onChange={(e) => setTemplateForm({ ...templateForm, topic: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Age Group</label>
                  <select
                    className="px-3.5 py-2 border border-slate-200 rounded-lg bg-white outline-none cursor-pointer focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    value={templateForm.ageGroup}
                    onChange={(e: any) => setTemplateForm({ ...templateForm, ageGroup: e.target.value })}
                  >
                    <option value="elementary">Elementary School</option>
                    <option value="middle">Middle School</option>
                    <option value="high">High School</option>
                    <option value="general">General (All Ages)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2.5 pt-7">
                  <input
                    type="checkbox"
                    id="isEnabled"
                    className="w-4 h-4 text-teal-600 border-slate-200 rounded focus:ring-teal-500/20 focus:ring-2 outline-none cursor-pointer"
                    checked={templateForm.isEnabled}
                    onChange={(e) => setTemplateForm({ ...templateForm, isEnabled: e.target.checked })}
                  />
                  <label htmlFor="isEnabled" className="font-bold text-slate-700 cursor-pointer">Enable this topic</label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">System Instruction Prompt</label>
                <textarea
                  required
                  rows={6}
                  className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-sans"
                  placeholder="e.g. You are a warm, encouraging AI Coach specialized in Growth Mindset..."
                  value={templateForm.systemPrompt}
                  onChange={(e) => setTemplateForm({ ...templateForm, systemPrompt: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateFormOpen(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-colors"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {isTranscriptModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-teal-700 text-white p-5 flex justify-between items-center border-b border-teal-800">
              <h2 className="font-extrabold text-lg">Session Transcript</h2>
              <button 
                onClick={() => setIsTranscriptModalOpen(false)}
                className="text-white hover:text-teal-200 text-2xl font-bold line-height-1 outline-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col gap-2 text-sm">
              <p className="m-0 font-medium">
                <strong className="text-slate-600">Student:</strong> {selectedSession.userId ? `${selectedSession.userId.firstName} ${selectedSession.userId.lastName} (${selectedSession.userId.username})` : 'Unknown'}
              </p>
              <p className="m-0 font-medium text-slate-500">
                <strong className="text-slate-600">Topic:</strong> <span className="capitalize">{selectedSession.topic}</span> | <strong className="text-slate-600">Date:</strong> {new Date(selectedSession.createdAt).toLocaleString()}
              </p>
              
              {selectedSession.summary && (
                <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <strong className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Session Summary</strong>
                  <p className="text-slate-700 m-0 text-sm leading-relaxed">{selectedSession.summary}</p>
                </div>
              )}
              {selectedSession.actions && selectedSession.actions.length > 0 && (
                <div className="mt-2 p-4 bg-teal-50/50 border border-teal-100 rounded-xl shadow-sm">
                  <strong className="text-[10px] font-black text-teal-600 uppercase tracking-wider block mb-1">Committed If-Then Plans</strong>
                  <ul className="list-disc pl-5 text-slate-700 space-y-1 mt-1 text-sm">
                    {selectedSession.actions.map((act: string, idx: number) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/30 flex flex-col gap-4">
              {selectedTranscript.length === 0 ? (
                <p className="text-center text-slate-400 italic py-12">No messages recorded in this session.</p>
              ) : (
                selectedTranscript.map((msg, index) => (
                  <div key={index} className={`flex flex-col max-w-[80%] p-4 rounded-2xl border border-slate-200 shadow-sm ${
                    msg.sender === 'user' 
                      ? 'self-end bg-teal-50 text-slate-800 rounded-br-none' 
                      : 'self-start bg-white text-slate-800 rounded-bl-none'
                  }`}>
                    <div className="flex justify-between items-baseline gap-4 mb-1 text-[10px] font-black text-slate-400 uppercase">
                      <span>{msg.sender === 'user' ? 'Student' : 'AI Coach'}</span>
                      <span className="font-normal text-slate-400/80">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between gap-4">
              <button 
                onClick={() => handleCopyLMS(selectedSession)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-xl text-sm shadow-md transition-colors"
              >
                Copy Summary for LMS 📋
              </button>
              <button 
                onClick={() => setIsTranscriptModalOpen(false)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2 px-5 rounded-xl text-sm shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminProfile;
