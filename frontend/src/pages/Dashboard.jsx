import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../api/reports";

function money(v) {
  return `₹ ${Number(v ?? 0).toFixed(2)}`;
}

export default function Dashboard() {
  const [trendDays, setTrendDays] = useState(14);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", { trendDays }],
    queryFn: () => getDashboard({ trendDays }),
  });

  if (isLoading) return <div className="text-slate-500">Loading dashboard…</div>;
  if (error) return <div className="text-red-600">Failed to load dashboard.</div>;

  const { today, month, all_time, trend } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>

      {/* TODAY */}
      <Section title="Today" subtitle={new Date().toLocaleDateString("en-IN")}>
        <Card label="Sales today" value={money(today.sales)} big accent="emerald" />
        <Card label="Cash collected" value={money(today.cash_collected)} />
        <Card label="UPI collected" value={money(today.upi_collected)} />
        <Card label="Gross profit" value={money(today.profit)} accent="emerald" />
        <Card label="Sales count" value={today.sales_count} />
      </Section>

      {/* MONTH */}
      <Section
        title="This month"
        subtitle={new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      >
        <Card label="Sales" value={money(month.sales)} big accent="emerald" />
        <Card label="Cash collected" value={money(month.cash_collected)} />
        <Card label="UPI collected" value={money(month.upi_collected)} />
        <Card label="Gross profit" value={money(month.profit)} accent="emerald" />
        <Card label="Sales count" value={month.sales_count} />
      </Section>

      {/* ALL TIME */}
      <Section title="All time">
        <Card label="Total purchases" value={money(all_time.total_purchases)} />
        <Card label="Total sales" value={money(all_time.total_sales)} />
        <Card label="Gross profit" value={money(all_time.gross_profit)} accent="emerald" />
        <Card
          label="Owed to us"
          value={money(all_time.owed_to_us)}
          accent="red"
          link="/customers"
        />
        <Card
          label="We owe wholesalers"
          value={money(all_time.we_owe)}
          accent="amber"
          link="/wholesaler-balances"
        />
      </Section>

      {/* TREND */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Daily trend</h3>
          <select
            value={trendDays}
            onChange={(e) => setTrendDays(Number(e.target.value))}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Sales ₹</th>
                <th className="text-right px-4 py-2">Profit ₹</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((row) => (
                <tr key={row.date} className="border-t border-slate-100">
                  <td className="px-4 py-1.5">{row.date}</td>
                  <td className="px-4 py-1.5 text-right">
                    {Number(row.sales) > 0 ? money(row.sales) : "—"}
                  </td>
                  <td className="px-4 py-1.5 text-right text-emerald-700">
                    {Number(row.profit) > 0 ? money(row.profit) : "—"}
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

function Section({ title, subtitle, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {children}
      </div>
    </div>
  );
}

function Card({ label, value, big, accent, link }) {
  const accentMap = {
    emerald: "text-emerald-700",
    red: "text-red-600",
    amber: "text-amber-600",
  };
  const accentClass = accentMap[accent] || "text-slate-800";

  const inner = (
    <>
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`${big ? "text-2xl" : "text-lg"} font-bold ${accentClass}`}
      >
        {value}
      </div>
    </>
  );

  const cardBase = "bg-white rounded-lg shadow p-4";
  if (link) {
    return (
      <Link to={link} className={`${cardBase} hover:shadow-md transition`}>
        {inner}
      </Link>
    );
  }
  return <div className={cardBase}>{inner}</div>;
}