"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
  RefreshCw,
  ArrowLeft,
  Clock,
  Radio,
  Calendar,
  Flame,
  CheckCircle,
} from "lucide-react";

interface MonitorStatus {
  id: string;
  name: string;
  currentStatus: "UP" | "DOWN" | "DEGRADED";
  uptimePercentage: number;
  avgResponseTimeMs: number;
  recentHistory: { isSuccess: boolean; responseTime: number }[];
}

interface IncidentTimelineUpdate {
  id: string;
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED" | string;
  message: string;
  createdAt: string;
}

interface IncidentStatusData {
  id: string;
  title: string;
  severity: "MINOR" | "MAJOR" | "CRITICAL" | "MAINTENANCE" | string;
  status: string;
  monitorName: string;
  startedAt: string;
  resolvedAt?: string | null;
  cause?: string | null;
  updates: IncidentTimelineUpdate[];
}

interface StatusPageData {
  title: string;
  isAllOperational: boolean;
  monitors: MonitorStatus[];
  activeIncidents?: IncidentStatusData[];
  pastIncidents?: IncidentStatusData[];
}

export default function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [data, setData] = useState<StatusPageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/status/${slug}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
        <span>Loading system status...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-gray-400 space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="text-white text-base">
          Status page not found or currently unavailable.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-gray-800 text-sm text-gray-200 hover:bg-gray-700"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const activeIncidents = data.activeIncidents || [];
  const pastIncidents = data.pastIncidents || [];

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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gray-800/80 border border-gray-700 text-xs font-semibold text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Status Page</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {data.title}
          </h1>
          <p className="text-xs text-gray-400">
            Real-time platform operational status & health metrics
          </p>
        </div>

        {/* System Health Status Card */}
        <div
          className={`p-6 rounded-2xl border flex items-center space-x-4 shadow-xl ${
            data.isAllOperational
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {data.isAllOperational ? (
            <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 flex-shrink-0 text-red-400" />
          )}
          <div>
            <h2 className="text-lg font-bold">
              {data.isAllOperational
                ? "All Systems Operational"
                : "Active Outage / Incident Reported"}
            </h2>
            <p className="text-xs opacity-80">
              {data.isAllOperational
                ? "All monitored API services are responding normally with zero active incidents."
                : "One or more API services are currently experiencing downtime or ongoing investigation."}
            </p>
          </div>
        </div>

        {/* Live Active Incidents Section */}
        {activeIncidents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-red-400">
              <Flame className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Active Incidents & Live Updates ({activeIncidents.length})
              </h3>
            </div>

            <div className="space-y-4">
              {activeIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="bg-[#131927] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-bold text-white">
                          {inc.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                          {inc.severity} Outage
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Impacted Service:{" "}
                        <span className="text-gray-200 font-semibold">
                          {inc.monitorName}
                        </span>{" "}
                        &bull; Started:{" "}
                        {new Date(inc.startedAt).toLocaleString()}
                      </p>
                    </div>

                    <div>{getStageBadge(inc.status)}</div>
                  </div>

                  {/* Incident Updates Timeline */}
                  <div className="space-y-3 pt-1">
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
                              {new Date(upd.createdAt).toLocaleTimeString()}{" "}
                              &bull;{" "}
                              {new Date(upd.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-200 pt-1 leading-relaxed">
                            {upd.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="bg-[#131927] border border-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Monitored Services
            </h3>
            <span className="text-xs text-gray-500">
              {data.monitors.length} Endpoints
            </span>
          </div>

          {data.monitors.length === 0 ? (
            <div className="py-8 text-center text-gray-400 space-y-3">
              <Activity className="w-8 h-8 mx-auto text-gray-600" />
              <p className="text-sm">No services configured yet.</p>
              <Link
                href="/dashboard/monitors/new"
                className="inline-block px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                + Add Monitor in Dashboard
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {data.monitors.map((m) => {
                const isUp = m.currentStatus === "UP";
                return (
                  <div
                    key={m.id}
                    className="py-4 space-y-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span
                          className={`w-3 h-3 rounded-full ${isUp ? "bg-emerald-400" : "bg-red-500"}`}
                        />
                        <span className="font-bold text-white text-base">
                          {m.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {m.uptimePercentage.toFixed(2)}% Uptime
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {m.avgResponseTimeMs}ms avg
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            isUp
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {isUp ? "Operational 🟢" : "Down 🔴"}
                        </span>
                      </div>
                    </div>

                    {/* 15-check visual history bar */}
                    <div className="flex items-center space-x-1.5 pt-1">
                      {Array.from({ length: 15 }).map((_, i) => {
                        const log = m.recentHistory[i];
                        const isOk = log ? log.isSuccess : isUp;
                        return (
                          <div
                            key={i}
                            className={`h-5 flex-1 rounded ${
                              isOk
                                ? "bg-emerald-500/80 hover:bg-emerald-400"
                                : "bg-red-500/80 hover:bg-red-400"
                            } transition-colors`}
                            title={
                              log
                                ? `${log.responseTime}ms`
                                : isUp
                                  ? "Operational"
                                  : "Down"
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Incidents Archive (Last 7 Days) */}
        <div className="bg-[#131927] border border-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                Past Incidents (Last 7 Days)
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              {pastIncidents.length === 0
                ? "No incidents reported"
                : `${pastIncidents.length} Resolved`}
            </span>
          </div>

          {pastIncidents.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500">
              <CheckCircle className="w-6 h-6 text-emerald-500/40 mx-auto mb-1.5" />
              <span>
                No service outages or incidents recorded in the last 7 days.
              </span>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/80 space-y-4 pt-1">
              {pastIncidents.map((inc) => (
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
                    {inc.cause ||
                      "Service recovered and operations normalized."}
                  </p>

                  {inc.updates.length > 0 && (
                    <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-gray-800/60 text-[11px] text-gray-300">
                      <span className="font-semibold text-emerald-400">
                        Final Update:{" "}
                      </span>
                      <span>{inc.updates[0].message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-800/60">
          <Link
            href="/dashboard"
            className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Admin Dashboard</span>
          </Link>
          <span>Auto-refreshes every 15s &bull; API Sentinel Platform</span>
        </div>
      </div>
    </div>
  );
}
