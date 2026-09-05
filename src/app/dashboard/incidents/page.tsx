"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  Plus,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Calendar,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

interface TimelineUpdate {
  id: string;
  status: string;
  message: string;
  createdAt: string;
}

interface IncidentItem {
  id: string;
  monitorId: string;
  monitorName: string;
  monitorUrl: string;
  title: string;
  severity: "MINOR" | "MAJOR" | "CRITICAL" | "MAINTENANCE" | string;
  status: string;
  startedAt: string;
  resolvedAt?: string | null;
  cause?: string | null;
  updates: TimelineUpdate[];
}

interface MonitorOption {
  id: string;
  name: string;
}

export default function IncidentsManagerPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [monitors, setMonitors] = useState<MonitorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New Incident Form State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    monitorId: "",
    title: "",
    severity: "MAJOR",
    status: "INVESTIGATING",
    message: "",
  });

  // Post update inline state map: incidentId -> { status, message }
  const [updateForms, setUpdateForms] = useState<
    Record<string, { status: string; message: string; loading: boolean }>
  >({});

  const fetchData = async () => {
    try {
      const [incRes, monRes] = await Promise.all([
        fetch("/api/incidents"),
        fetch("/api/monitors"),
      ]);
      const incData = await incRes.json();
      const monData = await monRes.json();

      setIncidents(incData.incidents || []);
      setMonitors(
        (monData.monitors || []).map((m: any) => ({ id: m.id, name: m.name })),
      );

      if (
        monData.monitors &&
        monData.monitors.length > 0 &&
        !newForm.monitorId
      ) {
        setNewForm((prev) => ({ ...prev, monitorId: monData.monitors[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.monitorId || !newForm.title || !newForm.message) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });

      if (res.ok) {
        setShowNewModal(false);
        setNewForm({
          monitorId: monitors[0]?.id || "",
          title: "",
          severity: "MAJOR",
          status: "INVESTIGATING",
          message: "",
        });
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostUpdate = async (incidentId: string) => {
    const formData = updateForms[incidentId] || {
      status: "INVESTIGATING",
      message: "",
      loading: false,
    };
    if (!formData.message.trim()) return;

    setUpdateForms((prev) => ({
      ...prev,
      [incidentId]: { ...formData, loading: true },
    }));

    try {
      const res = await fetch(`/api/incidents/${incidentId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: formData.status,
          message: formData.message,
        }),
      });

      if (res.ok) {
        setUpdateForms((prev) => ({
          ...prev,
          [incidentId]: {
            status: formData.status,
            message: "",
            loading: false,
          },
        }));
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdateForms((prev) => ({
        ...prev,
        [incidentId]: { ...formData, loading: false },
      }));
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage.toUpperCase()) {
      case "INVESTIGATING":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            🔍 Investigating
          </span>
        );
      case "IDENTIFIED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            🎯 Identified
          </span>
        );
      case "MONITORING":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            📊 Monitoring Fix
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            🟢 Resolved
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            {stage}
          </span>
        );
    }
  };

  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED");
  const resolvedIncidents = incidents.filter((i) => i.status === "RESOLVED");

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-400" />
              Incident Timeline & Status Updates
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Post real-time developer updates to the Public Status Page during
              service outages or maintenance
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/status/system-status"
            target="_blank"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700"
          >
            <span>View Public Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Post New Incident</span>
          </button>
        </div>
      </div>

      {/* New Incident Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131927] border border-gray-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" /> Declare Service
                Incident
              </h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-gray-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Impacted Monitor / Service *
                </label>
                <select
                  value={newForm.monitorId}
                  onChange={(e) =>
                    setNewForm({ ...newForm, monitorId: e.target.value })
                  }
                  required
                  className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {monitors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Severity *
                  </label>
                  <select
                    value={newForm.severity}
                    onChange={(e) =>
                      setNewForm({ ...newForm, severity: e.target.value })
                    }
                    className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MINOR">Minor Outage / Degraded</option>
                    <option value="MAJOR">Major Outage</option>
                    <option value="CRITICAL">Critical Disruption</option>
                    <option value="MAINTENANCE">Scheduled Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Initial Stage *
                  </label>
                  <select
                    value={newForm.status}
                    onChange={(e) =>
                      setNewForm({ ...newForm, status: e.target.value })
                    }
                    className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="INVESTIGATING">🔍 Investigating</option>
                    <option value="IDENTIFIED">🎯 Identified</option>
                    <option value="MONITORING">📊 Monitoring Fix</option>
                    <option value="RESOLVED">🟢 Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Incident Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database connectivity issues in US-East region"
                  value={newForm.title}
                  onChange={(e) =>
                    setNewForm({ ...newForm, title: e.target.value })
                  }
                  className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Public Status Message *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. We are investigating elevated response times and intermittent 502 errors..."
                  value={newForm.message}
                  onChange={(e) =>
                    setNewForm({ ...newForm, message: e.target.value })
                  }
                  className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-all flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting ? "Publishing..." : "Publish Incident"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#131927] border border-gray-800 p-4 rounded-xl">
          <span className="text-xs text-gray-400 font-medium block">
            Active Incidents
          </span>
          <span
            className={`text-2xl font-black font-mono mt-1 block ${
              activeIncidents.length > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {activeIncidents.length}
          </span>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-4 rounded-xl">
          <span className="text-xs text-gray-400 font-medium block">
            Resolved (Past 7 Days)
          </span>
          <span className="text-2xl font-black text-white font-mono mt-1 block">
            {resolvedIncidents.length}
          </span>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-4 rounded-xl">
          <span className="text-xs text-gray-400 font-medium block">
            Public Status Page
          </span>
          <span className="text-sm font-bold text-emerald-400 font-mono mt-2 block flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Broadcast
            Active
          </span>
        </div>
      </div>

      {/* Active Incidents List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-red-400" /> Active Incidents & Ongoing
          Outages ({activeIncidents.length})
        </h2>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            <p className="text-xs">Loading incident timeline...</p>
          </div>
        ) : activeIncidents.length === 0 ? (
          <div className="bg-[#131927] border border-gray-800 rounded-2xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">
              All Systems Operational
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              No active outages or open incidents. Everything is performing
              normally.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeIncidents.map((inc) => {
              const currentUpdateForm = updateForms[inc.id] || {
                status: inc.status === "OPEN" ? "INVESTIGATING" : inc.status,
                message: "",
                loading: false,
              };

              return (
                <div
                  key={inc.id}
                  className="bg-[#131927] border border-red-500/30 rounded-2xl p-6 shadow-xl space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-bold text-white">
                          {inc.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                          {inc.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Affected Endpoint:{" "}
                        <span className="text-gray-200 font-semibold">
                          {inc.monitorName}
                        </span>{" "}
                        &bull; Started:{" "}
                        {new Date(inc.startedAt).toLocaleString()}
                      </p>
                    </div>

                    <div>{getStageBadge(inc.status)}</div>
                  </div>

                  {/* Timeline History */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                      Timeline Updates ({inc.updates.length})
                    </span>

                    {inc.updates.map((upd, idx) => (
                      <div
                        key={upd.id || idx}
                        className="flex items-start space-x-3 text-xs"
                      >
                        <div className="mt-1 flex-shrink-0">
                          <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                        </div>
                        <div className="space-y-1 bg-[#0b0f19] border border-gray-800 p-3 rounded-xl flex-1">
                          <div className="flex items-center justify-between">
                            {getStageBadge(upd.status)}
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(upd.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-200 pt-1 leading-relaxed">
                            {upd.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Post Step Update Form */}
                  <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-4 space-y-3 pt-3">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Send className="w-3.5 h-3.5" /> Post Public Timeline
                      Update
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="sm:col-span-1">
                        <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">
                          New Stage
                        </label>
                        <select
                          value={currentUpdateForm.status}
                          onChange={(e) =>
                            setUpdateForms((prev) => ({
                              ...prev,
                              [inc.id]: {
                                ...currentUpdateForm,
                                status: e.target.value,
                              },
                            }))
                          }
                          className="w-full bg-[#131927] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="INVESTIGATING">
                            🔍 Investigating
                          </option>
                          <option value="IDENTIFIED">🎯 Identified</option>
                          <option value="MONITORING">📊 Monitoring Fix</option>
                          <option value="RESOLVED">🟢 Resolved (Close)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">
                          Developer Update Note
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Hotfix deployed to production, latency recovering..."
                          value={currentUpdateForm.message}
                          onChange={(e) =>
                            setUpdateForms((prev) => ({
                              ...prev,
                              [inc.id]: {
                                ...currentUpdateForm,
                                message: e.target.value,
                              },
                            }))
                          }
                          className="w-full bg-[#131927] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <button
                          type="button"
                          onClick={() => handlePostUpdate(inc.id)}
                          disabled={
                            currentUpdateForm.loading ||
                            !currentUpdateForm.message.trim()
                          }
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-500 text-slate-950 font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                        >
                          <Send className="w-3 h-3" />
                          <span>
                            {currentUpdateForm.loading
                              ? "Posting..."
                              : "Post Note"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved Incidents History */}
      <div className="bg-[#131927] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Resolved Incidents
            Archive ({resolvedIncidents.length})
          </h2>
        </div>

        {resolvedIncidents.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            <CheckCircle className="w-6 h-6 text-emerald-500/40 mx-auto mb-1.5" />
            <span>No resolved incidents in history.</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/80 space-y-4 pt-1">
            {resolvedIncidents.map((inc) => (
              <div key={inc.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">
                      {inc.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Resolved
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(inc.startedAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-gray-400">
                  {inc.cause || "Service recovered and operations normalized."}
                </p>

                {inc.updates.length > 0 && (
                  <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-gray-800/60 text-[11px] text-gray-300">
                    <span className="font-semibold text-emerald-400">
                      Final Resolution Note:{" "}
                    </span>
                    <span>{inc.updates[inc.updates.length - 1].message}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
