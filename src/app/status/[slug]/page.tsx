'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, AlertTriangle, Activity, RefreshCw, ArrowLeft } from 'lucide-react';

interface MonitorStatus {
  id: string;
  name: string;
  currentStatus: 'UP' | 'DOWN' | 'DEGRADED';
  uptimePercentage: number;
  avgResponseTimeMs: number;
  recentHistory: { isSuccess: boolean; responseTime: number }[];
}

interface StatusPageData {
  title: string;
  isAllOperational: boolean;
  monitors: MonitorStatus[];
}

export default function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
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
        <p className="text-white text-base">Status page not found or currently unavailable.</p>
        <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-gray-800 text-sm text-gray-200 hover:bg-gray-700">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gray-800/80 border border-gray-700 text-xs font-semibold text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Status Page</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{data.title}</h1>
          <p className="text-xs text-gray-400">Real-time platform operational status & health metrics</p>
        </div>

        {/* System Health Status Card */}
        <div
          className={`p-6 rounded-2xl border flex items-center space-x-4 shadow-xl ${
            data.isAllOperational
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {data.isAllOperational ? (
            <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 flex-shrink-0 text-red-400" />
          )}
          <div>
            <h2 className="text-lg font-bold">
              {data.isAllOperational ? 'All Systems Operational' : 'Partial Service Outage Detected'}
            </h2>
            <p className="text-xs opacity-80">
              {data.isAllOperational
                ? 'All monitored API services are responding normally.'
                : 'One or more API services are currently experiencing downtime or errors.'}
            </p>
          </div>
        </div>

        {/* Services List */}
        <div className="bg-[#131927] border border-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Monitored Services</h3>
            <span className="text-xs text-gray-500">{data.monitors.length} Endpoints</span>
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
                const isUp = m.currentStatus === 'UP';
                return (
                  <div key={m.id} className="py-4 space-y-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`w-3 h-3 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-red-500'}`} />
                        <span className="font-bold text-white text-base">{m.name}</span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {m.uptimePercentage.toFixed(2)}% Uptime
                        </span>
                        <span className="text-xs font-mono text-gray-400">{m.avgResponseTimeMs}ms avg</span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {isUp ? 'Operational 🟢' : 'Down 🔴'}
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
                              isOk ? 'bg-emerald-500/80 hover:bg-emerald-400' : 'bg-red-500/80 hover:bg-red-400'
                            } transition-colors`}
                            title={log ? `${log.responseTime}ms` : isUp ? 'Operational' : 'Down'}
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

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-800/60">
          <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Admin Dashboard</span>
          </Link>
          <span>Auto-refreshes every 15s &bull; API Sentinel Platform</span>
        </div>
      </div>
    </div>
  );
}
