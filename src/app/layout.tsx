import "./globals.css";
import Link from "next/link";
import { Activity, Plus, ShieldCheck, Bell, Radio, Flame } from "lucide-react";

export const metadata = {
  title: "API Sentinel | Uptime & Performance Monitoring",
  description:
    "Real-time API uptime monitoring, latency tracking, incident management, and status pages.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f19] text-gray-100 min-h-screen flex flex-col antialiased">
        <header className="border-b border-gray-800 bg-[#111625]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                </div>
                <div>
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                    API Sentinel
                  </span>
                  <span className="block text-[10px] text-emerald-400 font-medium tracking-wider uppercase">
                    Uptime Platform
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center space-x-1 text-sm font-medium text-gray-300">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 rounded-lg hover:text-white hover:bg-gray-800/60 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/incidents"
                  className="px-3 py-2 rounded-lg hover:text-white hover:bg-gray-800/60 transition-colors flex items-center space-x-1.5"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Incidents</span>
                </Link>
                <Link
                  href="/dashboard/alerts"
                  className="px-3 py-2 rounded-lg hover:text-white hover:bg-gray-800/60 transition-colors flex items-center space-x-1.5"
                >
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <span>Alert Channels</span>
                </Link>
                <Link
                  href="/status/system-status"
                  target="_blank"
                  className="px-3 py-2 rounded-lg hover:text-white hover:bg-gray-800/60 transition-colors flex items-center space-x-1.5"
                >
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Public Status Page</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard/monitors/new"
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-semibold px-4 py-2 rounded-lg shadow-md shadow-emerald-500/10 text-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add API Monitor</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-800/80 bg-[#0d111c] py-6 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                API Sentinel Monitor Platform — SaaS Portfolio Project
              </span>
            </div>
            {/* <div>
              Powered by Next.js 15, Node.js, PostgreSQL (pg), BullMQ & Redis
            </div> */}
          </div>
        </footer>
      </body>
    </html>
  );
}
