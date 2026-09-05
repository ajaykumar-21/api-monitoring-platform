"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  ArrowUpRight,
  ExternalLink,
  Pencil,
  Lock,
  ShieldCheck,
} from "lucide-react";

interface Monitor {
  id: string;
  name: string;
  url: string;
  method: string;
  intervalSec: number;
  expectedStatus: number;
  currentStatus: "UP" | "DOWN" | "DEGRADED";
  isActive: boolean;
  sslValid?: boolean | null;
  sslDaysRemaining?: number | null;
  sslIssuer?: string | null;
  uptimePercentage: number;
  avgResponseTimeMs: number;
  latestResponseTimeMs: number | null;
  latestTestedAt: string | null;
  openIncidentsCount: number;
}

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchMonitors = async () => {
    try {
      const res = await fetch("/api/monitors");
      const data = await res.json();
      setMonitors(data.monitors || []);
    } catch (err) {
      console.error("Failed to fetch monitors:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleManualCheck = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTestingId(id);
    try {
      await fetch(`/api/monitors/${id}/check`, { method: "POST" });
      await fetchMonitors();
    } catch (err) {
      console.error("Failed trigger ping:", err);
    } finally {
      setTestingId(null);
    }
  };

  // Aggregates
  const totalMonitors = monitors.length;
  const upMonitors = monitors.filter((m) => m.currentStatus === "UP").length;
  const downMonitors = monitors.filter(
    (m) => m.currentStatus === "DOWN",
  ).length;

  const avgSystemUptime =
    totalMonitors > 0
      ? (
          monitors.reduce((acc, m) => acc + m.uptimePercentage, 0) /
          totalMonitors
        ).toFixed(2)
      : "100.00";

  const avgSystemLatency =
    totalMonitors > 0
      ? Math.round(
          monitors.reduce((acc, m) => acc + m.avgResponseTimeMs, 0) /
            totalMonitors,
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            API Health Dashboard
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Monitoring
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time status, latency metrics, and background health checks for
            your APIs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchMonitors();
            }}
            className="p-2 rounded-lg bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-700/80 border border-gray-700 transition-colors"
            title="Refresh monitors"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>

          <Link
            href="/dashboard/monitors/new"
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Monitor</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131927] border border-gray-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <span>Overall System Uptime</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {avgSystemUptime}%
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              Last 24 hours
            </span>
          </div>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <span>Active Monitors</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {upMonitors}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              / {totalMonitors} Operational
            </span>
          </div>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <span>Open Incidents</span>
            <AlertTriangle
              className={`w-4 h-4 ${downMonitors > 0 ? "text-red-400" : "text-gray-500"}`}
            />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span
              className={`text-3xl font-extrabold ${downMonitors > 0 ? "text-red-400" : "text-white"}`}
            >
              {downMonitors}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              Down Endpoint{downMonitors !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <span>Avg Response Time</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {avgSystemLatency}ms
            </span>
            <span className="text-xs text-gray-400 font-medium">
              Average Latency
            </span>
          </div>
        </div>
      </div>

      {/* Main Health Monitor List */}
      <div className="bg-[#131927] border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Monitored Endpoints
            </h2>
            <p className="text-xs text-gray-400">
              Pinging every 1-5 minutes to verify HTTP status & latency
            </p>
          </div>
          <Link
            href="/status/system-status"
            target="_blank"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
          >
            <span>View Public Status Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            <p className="text-sm">Loading API health monitors...</p>
          </div>
        ) : monitors.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-800/60 flex items-center justify-center mx-auto text-gray-400">
              <Activity className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-semibold text-white">
                No monitors configured yet
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Add an API endpoint to start tracking uptime and response times.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard/monitors/new"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition-colors shadow-md shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Your First Monitor</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/80">
            {monitors.map((m) => {
              const isUp = m.currentStatus === "UP";
              return (
                <div
                  key={m.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors group"
                >
                  <div className="flex items-start space-x-4 min-w-0">
                    <div className="pt-1">
                      {isUp ? (
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      ) : (
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/monitors/${m.id}`}
                          className="font-bold text-white hover:text-emerald-400 transition-colors text-base truncate"
                        >
                          {m.name}
                        </Link>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                          {m.method}
                        </span>

                        {m.url.startsWith("https://") && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              m.sslDaysRemaining !== null &&
                              m.sslDaysRemaining !== undefined
                                ? m.sslDaysRemaining <= 0
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : m.sslDaysRemaining <= 14
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-gray-800 text-gray-400 border-gray-700"
                            }`}
                            title={
                              m.sslIssuer
                                ? `SSL Issuer: ${m.sslIssuer}`
                                : "SSL Secured"
                            }
                          >
                            <Lock className="w-2.5 h-2.5" />
                            {m.sslDaysRemaining !== null &&
                            m.sslDaysRemaining !== undefined
                              ? m.sslDaysRemaining <= 0
                                ? "SSL Expired"
                                : `${m.sslDaysRemaining}d SSL`
                              : "HTTPS"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono truncate mt-0.5 max-w-lg">
                        {m.url}
                      </div>
                    </div>
                  </div>

                  {/* Status, Latency & Actions */}
                  <div className="flex items-center space-x-6 justify-between sm:justify-end">
                    {/* Uptime % */}
                    <div className="text-right">
                      <div className="flex items-center space-x-1.5 justify-end">
                        <span
                          className={`text-sm font-bold font-mono ${isUp ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {m.uptimePercentage.toFixed(2)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 block">
                        24h Uptime
                      </span>
                    </div>

                    {/* Response Time */}
                    <div className="text-right min-w-[80px]">
                      <div className="text-sm font-bold font-mono text-gray-200">
                        {m.latestResponseTimeMs !== null
                          ? `${m.latestResponseTimeMs}ms`
                          : "—"}
                      </div>
                      <span className="text-[10px] text-gray-500 block">
                        Latency
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleManualCheck(m.id, e)}
                        disabled={testingId === m.id}
                        title="Run instant HTTP health check"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors text-xs font-medium flex items-center space-x-1"
                      >
                        <Play
                          className={`w-3.5 h-3.5 ${testingId === m.id ? "animate-spin text-emerald-400" : ""}`}
                        />
                        <span className="hidden md:inline">Check</span>
                      </button>

                      <Link
                        href={`/dashboard/monitors/${m.id}/edit`}
                        title="Edit Monitor"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors text-xs font-medium"
                      >
                        <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                      </Link>

                      <Link
                        href={`/dashboard/monitors/${m.id}`}
                        title="View Analytics & Logs"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 border border-gray-700 transition-colors text-xs font-medium flex items-center space-x-1"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
