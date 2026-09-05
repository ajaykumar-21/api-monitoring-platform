"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Mail,
  Webhook,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface AlertChannel {
  id: string;
  type: "EMAIL" | "WEBHOOK";
  target: string;
  is_active: boolean;
  created_at: string;
}

export default function AlertsSettingsPage() {
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"EMAIL" | "WEBHOOK">("EMAIL");
  const [target, setTarget] = useState("");

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setChannels(data.alertChannels || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, target }),
      });
      setTarget("");
      await fetchChannels();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      await fetchChannels();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-400" />
            Alert Channels & Notifications
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure Email and Webhook destinations to receive instant alerts
            when an API goes DOWN or recovers.
          </p>
        </div>
      </div>

      {/* Feature Notice Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Email Delivery — Upcoming Feature (In Development)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Automated email delivery via SMTP / transactional providers is
              currently being integrated. You can still register your email
              addresses and Discord/Slack Webhooks now so they are active as
              soon as email delivery goes live!
            </p>
          </div>
        </div>
      </div>

      {/* Add Alert Channel Card */}
      <div className="bg-[#131927] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Notification Destination
        </h2>

        <form
          onSubmit={handleAddChannel}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Channel Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "EMAIL" | "WEBHOOK")}
              className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="EMAIL">📧 Email Address (Upcoming)</option>
              <option value="WEBHOOK">🔗 Discord / Slack Webhook</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center justify-between">
              <span>
                {type === "EMAIL" ? "Destination Email Address" : "Webhook URL"}
              </span>
              {type === "EMAIL" && (
                <span className="text-[10px] text-amber-400 font-medium">
                  Coming soon
                </span>
              )}
            </label>
            <input
              type={type === "EMAIL" ? "email" : "url"}
              required
              placeholder={
                type === "EMAIL"
                  ? "developer@example.com"
                  : "https://discord.com/api/webhooks/..."
              }
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{saving ? "Adding..." : "Add Channel"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Channels List */}
      <div className="bg-[#131927] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            Active Alert Channels
          </h3>
          <span className="text-xs text-gray-400">
            {channels.length} Configured
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            <p className="text-xs">Loading alert channels...</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="p-8 text-center text-gray-400 space-y-2">
            <Bell className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-sm font-medium text-white">
              No alert channels configured yet
            </p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Add your email address or Discord webhook above to get notified
              automatically whenever an endpoint fails.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/80">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-emerald-400">
                    {ch.type === "EMAIL" ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Webhook className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white font-mono">
                        {ch.target}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          ch.type === "EMAIL"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {ch.type === "EMAIL" ? "EMAIL (UPCOMING)" : ch.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      Added on {new Date(ch.created_at).toLocaleDateString()}{" "}
                      &bull; Status:{" "}
                      {ch.type === "EMAIL"
                        ? "Pending Provider Activation"
                        : "Active"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(ch.id)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  title="Remove channel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
