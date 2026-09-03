import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bell,
  BarChart3,
  Radio,
} from "lucide-react";

export default function Home() {
  return (
    <div className="py-12 space-y-16 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <Activity className="w-4 h-4" />
          <span>Mini UptimeRobot + Postman SaaS Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Automated API Monitoring <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            & Real-Time Latency Analytics
          </span>
        </h1>

        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Monitor your APIs and backend microservices every minute. Measure
          latency percentiles, trigger webhook alerts, track incidents, and
          publish public status pages automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/status/system-status"
            target="_blank"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 border border-gray-700 text-base font-semibold flex items-center justify-center space-x-2 transition-colors"
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Public Status Page Demo</span>
          </Link>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="bg-[#131927] border border-gray-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Cron & Background Workers
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Distributed task queue powered by Redis & BullMQ executing
            high-precision HTTP health checks on automated cron intervals.
          </p>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Latency Charts & Analytics
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Interactive response-time distribution graphs, 24h/7d uptime
            percentages (99.98%), and status code assertions.
          </p>
        </div>

        <div className="bg-[#131927] border border-gray-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Webhooks & Incident Alerts
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Instant Slack/Discord webhook alerts, consecutive failure
            thresholds, and automatic incident lifecycle management.
          </p>
        </div>
      </div>
    </div>
  );
}
