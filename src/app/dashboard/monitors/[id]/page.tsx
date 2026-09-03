"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Trash2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Pencil,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface PingLog {
  id: string;
  statusCode: number | null;
  responseTime: number;
  isSuccess: boolean;
  errorMessage: string | null;
  testedAt: string;
}

interface Incident {
  id: string;
  status: "OPEN" | "RESOLVED";
  startedAt: string;
  resolvedAt: string | null;
  cause: string | null;
}

interface MonitorDetail {
  id: string;
  name: string;
  url: string;
  method: string;
  intervalSec: number;
  expectedStatus: number;
  currentStatus: "UP" | "DOWN" | "DEGRADED";
  isActive: boolean;
  pingLogs: PingLog[];
  incidents: Incident[];
}

interface Stats {
  uptimePercentage: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  totalPings: number;
  successfulPings: number;
  failedPings: number;
}

interface ChartItem {
  time: string;
  responseTime: number;
  isSuccess: number;
  statusCode: number;
}

export default function MonitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<{
    monitor: MonitorDetail;
    stats: Stats;
    chartData: ChartItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/monitors/${id}`);
      if (!res.ok) throw new Error("Monitor not found");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleManualCheck = async () => {
    setTesting(true);
    try {
      await fetch(`/api/monitors/${id}/check`, { method: "POST" });
      await fetchDetail();
    } catch (err) {
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this monitor?")) return;
    try {
      await fetch(`/api/monitors/${id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-16 text-center text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-3" />
        <p className="text-sm">Loading API latency analytics...</p>
      </div>
    );
  }

  const { monitor, stats, chartData } = data;
  const isUp = monitor.currentStatus === "UP";

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">{monitor.name}</h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                {monitor.method}
              </span>
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                  isUp
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isUp ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}
                />
                <span>{isUp ? "Operational 🟢" : "Service Down 🔴"}</span>
              </span>
            </div>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-emerald-400 font-mono mt-1 inline-flex items-center gap-1 truncate max-w-xl"
            >
              <span>{monitor.url}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleManualCheck}
            disabled={testing}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-all flex items-center space-x-2 shadow-md shadow-emerald-500/10"
          >
            <Play
              className={`w-4 h-4 fill-slate-950 ${testing ? "animate-spin" : ""}`}
            />
            <span>{testing ? "Testing..." : "Run Instant Check"}</span>
          </button>

          <Link
            href={`/dashboard/monitors/${id}/edit`}
            className="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-medium text-sm transition-colors flex items-center space-x-1.5"
            title="Edit Monitor Settings"
          >
            <Pencil className="w-4 h-4 text-emerald-400" />
            <span>Edit</span>
          </Link>

          <button
            onClick={handleDelete}
            className="p-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
            title="Delete Monitor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#131927] border border-gray-800 p-4 rounded-xl">
          <span className="text-xs text-gray-400 font-medium block">
            Uptime (24h)
          </span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
            {stats.uptimePercentage}%
          </span>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-4 rounded-xl">
          <span className="text-xs text-gray-400 font-medium block">
            Avg Latency
          </span>
          <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
            {stats.avgLatency}ms
          </span>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-4 rounded-xl">
          <span className="text-xs text-gray-400 font-medium block">
            Min / Max Latency
          </span>
          <span className="text-xl font-extrabold text-gray-200 font-mono mt-1 block">
            {stats.minLatency}ms / {stats.maxLatency}ms
          </span>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-4 rounded-xl">
          <span className="text-xs text-gray-400 font-medium block">
            Check Interval
          </span>
          <span className="text-2xl font-extrabold text-indigo-400 font-mono mt-1 block">
            {monitor.intervalSec}s
          </span>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-4 rounded-xl col-span-2 lg:col-span-1">
          <span className="text-xs text-gray-400 font-medium block">
            Total Checks
          </span>
          <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
            {stats.totalPings}
          </span>
        </div>
      </div>

      {/* Latency Chart */}
      <div className="bg-[#131927] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> Response Time &
              Latency (ms)
            </h2>
            <p className="text-xs text-gray-400">
              Response time trend measured over recent health checks
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="latencyGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  unit="ms"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#94a3b8", fontSize: "12px" }}
                  itemStyle={{
                    color: "#34d399",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                  formatter={(val: unknown) => [`${val} ms`, "Response Time"]}
                />
                <Area
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              No ping logs recorded yet. Click &quot;Run Instant Check&quot;
              above.
            </div>
          )}
        </div>
      </div>

      {/* Recent Ping Logs Table */}
      <div className="bg-[#131927] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-base font-bold text-white">Recent Ping Logs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f19] text-gray-400 border-b border-gray-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">HTTP Code</th>
                <th className="px-6 py-3">Response Time</th>
                <th className="px-6 py-3">Details / Error</th>
                <th className="px-6 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 text-gray-300">
              {monitor.pingLogs.slice(0, 15).map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-3">
                    {log.isSuccess ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>SUCCESS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-red-400 font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>FAILED</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono font-bold">
                    {log.statusCode ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${log.isSuccess ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                      >
                        {log.statusCode}
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono text-gray-200 font-bold">
                    {log.responseTime}ms
                  </td>
                  <td className="px-6 py-3 max-w-xs truncate text-gray-400">
                    {log.errorMessage ? (
                      <span className="text-red-400">{log.errorMessage}</span>
                    ) : (
                      "OK"
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-gray-500">
                    {new Date(log.testedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
