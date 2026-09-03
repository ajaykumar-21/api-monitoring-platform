"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Activity,
  Code,
  Settings,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function EditMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    url: "",
    method: "GET",
    intervalSec: 60,
    expectedStatus: 200,
    timeoutMs: 10000,
    headers: "",
    body: "",
    failureThreshold: 2,
    isActive: true,
  });

  useEffect(() => {
    const fetchMonitor = async () => {
      try {
        const res = await fetch(`/api/monitors/${id}`);
        if (!res.ok) throw new Error("Monitor not found");
        const data = await res.json();
        const m = data.monitor;
        setForm({
          name: m.name || "",
          url: m.url || "",
          method: m.method || "GET",
          intervalSec: m.intervalSec || 60,
          expectedStatus: m.expectedStatus || 200,
          timeoutMs: m.timeoutMs || 10000,
          headers: m.headers || "",
          body: m.body || "",
          failureThreshold: m.failureThreshold || 2,
          isActive: m.isActive ?? true,
        });
      } catch (err: unknown) {
        const errStr = err instanceof Error ? err.message : String(err);
        setError(errStr);
      } finally {
        setLoading(false);
      }
    };
    fetchMonitor();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update monitor");
      }

      router.push(`/dashboard/monitors/${id}`);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setError(errStr);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-3" />
        <p className="text-sm">Loading monitor settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href={`/dashboard/monitors/${id}`}
          className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Edit Monitor: {form.name}
          </h1>
          <p className="text-xs text-gray-400">
            Update check frequency, expected status codes, or timeout thresholds
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-[#131927] border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl"
      >
        {/* Basic Config */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4" /> Endpoint Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Friendly Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Users API / Payments Service"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                HTTP Method *
              </label>
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Target URL *
            </label>
            <input
              type="url"
              required
              placeholder="https://api.example.com/v1/users"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <hr className="border-gray-800" />

        {/* Assertions & Schedule */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4" /> Schedule, Status & Timeout
            Thresholds
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Check Interval *
              </label>
              <select
                value={form.intervalSec}
                onChange={(e) =>
                  setForm({ ...form, intervalSec: Number(e.target.value) })
                }
                className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={60}>Every 1 minute (Fast)</option>
                <option value={300}>Every 5 minutes</option>
                <option value={900}>Every 15 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Expected HTTP Status *
              </label>
              <input
                type="number"
                required
                value={form.expectedStatus}
                onChange={(e) =>
                  setForm({ ...form, expectedStatus: Number(e.target.value) })
                }
                className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Timeout Threshold (ms)
              </label>
              <input
                type="number"
                value={form.timeoutMs}
                onChange={(e) =>
                  setForm({ ...form, timeoutMs: Number(e.target.value) })
                }
                className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Consecutive Failure Threshold
              </label>
              <select
                value={form.failureThreshold}
                onChange={(e) =>
                  setForm({ ...form, failureThreshold: Number(e.target.value) })
                }
                className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 failure (Immediate alert)</option>
                <option value={2}>2 consecutive failures (Recommended)</option>
                <option value={3}>3 consecutive failures</option>
                <option value={5}>5 consecutive failures</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Monitoring Status
              </label>
              <select
                value={form.isActive ? "true" : "false"}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.value === "true" })
                }
                className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="true">🟢 Active (Running ping checks)</option>
                <option value="false">⏸️ Paused (Do not ping)</option>
              </select>
            </div>
          </div>
        </div>

        <hr className="border-gray-800" />

        {/* Custom Headers & Body */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Code className="w-4 h-4" /> Request Headers & Body (Optional)
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Custom HTTP Headers (JSON format)
            </label>
            <textarea
              rows={3}
              placeholder='{ "Authorization": "Bearer token", "X-Custom-Header": "value" }'
              value={form.headers}
              onChange={(e) => setForm({ ...form, headers: e.target.value })}
              className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg p-3 text-xs font-mono text-emerald-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {(form.method === "POST" ||
            form.method === "PUT" ||
            form.method === "PATCH") && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Request Body (JSON format)
              </label>
              <textarea
                rows={4}
                placeholder='{ "query": "ping", "user": "test" }'
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg p-3 text-xs font-mono text-emerald-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-800">
          <Link
            href={`/dashboard/monitors/${id}`}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-2 rounded-lg text-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Updating Monitor..." : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
