import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DashboardLayout } from "../components/Shell.jsx";
import { DashboardTop, Stat } from "../components/OfferCard.jsx";

const analyticsSeries = [
  { day: "Mon", revenue: 2400, payouts: 980, users: 320 },
  { day: "Tue", revenue: 3100, payouts: 1280, users: 410 },
  { day: "Wed", revenue: 2800, payouts: 1160, users: 390 },
  { day: "Thu", revenue: 3900, payouts: 1510, users: 520 },
  { day: "Fri", revenue: 4600, payouts: 1880, users: 610 },
  { day: "Sat", revenue: 5200, payouts: 2020, users: 690 },
  { day: "Sun", revenue: 4800, payouts: 1760, users: 640 }
];

const categoryRows = [
  { name: "CPX Research", value: 52 },
  { name: "TheoremReach", value: 38 },
  { name: "Daily Bonuses", value: 10 }
];

export function AnalyticsPage({ navigate, api }) {
  return (
    <DashboardLayout active="Analytics" navigate={navigate} api={api}>
      <DashboardTop kicker="Analytics" title="Performance dashboard" copy="Revenue, payout exposure, user growth, conversion, provider quality, and category mix." action={<span className="tag blue">Live API ready</span>} />
      <div className="stats">
        <Stat label="Revenue" value="$18,900" />
        <Stat label="Payouts" value="$7,420" />
        <Stat label="Conversion" value="18.4%" />
        <Stat label="Active Users" value="12,450" />
      </div>
      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Revenue vs payouts</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analyticsSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="day" stroke="#aeb8c7" />
              <YAxis stroke="#aeb8c7" />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#32e6a1" fill="rgba(50,230,161,.18)" />
              <Area type="monotone" dataKey="payouts" stroke="#46c7ff" fill="rgba(70,199,255,.12)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-card">
          <h3>Category mix</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="name" stroke="#aeb8c7" />
              <YAxis stroke="#aeb8c7" />
              <Tooltip />
              <Bar dataKey="value" fill="#ffc857" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
