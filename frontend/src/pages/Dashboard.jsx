import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingCart,
  Truck,
  Users,
  Package,
  Plus,
  Wrench,
  Coins,
  ClipboardList,
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

import { getDashboard } from "../api/reports";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/PageHeader";

function money(v) {
  return `₹ ${Number(v ?? 0).toFixed(2)}`;
}

export default function Dashboard() {
  const [trendDays, setTrendDays] = useState(14);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", { trendDays }],
    queryFn: () => getDashboard({ trendDays }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load dashboard.</div>;
  }

  const { today, month, all_time, trend } = data;

  // Compute yesterday for trend comparison
  const yesterday = trend.length >= 2 ? trend[trend.length - 2] : null;
  const todaySalesChange =
    yesterday && Number(yesterday.sales) > 0
      ? ((Number(today.sales) - Number(yesterday.sales)) /
          Number(yesterday.sales)) *
        100
      : null;

  // Format chart data
  const chartData = trend.map((row) => ({
    date: row.date.slice(5), // MM-DD
    sales: Number(row.sales),
    profit: Number(row.profit),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/sales?new=1">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md h-12 px-6 text-base font-semibold"
          >
            <Plus className="size-5" />
            New Sale
          </Button>
        </Link>
        <Link to="/purchases?new=1">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md h-12 px-6 text-base font-semibold"
          >
            <Plus className="size-5" />
            New Purchase
          </Button>
        </Link>
        <Link to="/switchboards">
          <Button size="lg" variant="outline" className="h-12 px-5 text-base">
            <Wrench className="size-5" />
            Build Board
          </Button>
        </Link>
        <Link to="/products">
          <Button size="lg" variant="outline" className="h-12 px-5 text-base">
            <Package className="size-5" />
            Products
          </Button>
        </Link>
      </div>

      {/* Today */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Today
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Sales today"
            value={money(today.sales)}
            icon={ShoppingCart}
            accent="emerald"
            trend={todaySalesChange}
            big
          />
          <StatCard
            label="Cash collected"
            value={money(today.cash_collected)}
            icon={Coins}
          />
          <StatCard
            label="UPI collected"
            value={money(today.upi_collected)}
            icon={Wallet}
          />
          <StatCard
            label="Gross profit"
            value={money(today.profit)}
            icon={TrendingUp}
            accent="emerald"
          />
          <StatCard
            label="Sales count"
            value={today.sales_count}
            icon={Package}
          />
        </div>
      </section>

      {/* Month */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          This month
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Sales"
            value={money(month.sales)}
            icon={ShoppingCart}
            accent="emerald"
          />
          <StatCard
            label="Cash"
            value={money(month.cash_collected)}
            icon={Coins}
          />
          <StatCard
            label="UPI"
            value={money(month.upi_collected)}
            icon={Wallet}
          />
          <StatCard
            label="Gross profit"
            value={money(month.profit)}
            icon={TrendingUp}
            accent="emerald"
          />
          <StatCard
            label="Sales count"
            value={month.sales_count}
            icon={Package}
          />
        </div>
      </section>

      {/* Trend chart */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Daily trend
          </h2>
          <Select
            value={String(trendDays)}
            onValueChange={(v) => setTrendDays(Number(v))}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="p-4">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(160 84% 39%)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(160 84% 39%)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(217 91% 60%)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(217 91% 60%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(240 4% 46%)" }}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(240 6% 90%)",
                  fontSize: 12,
                }}
                formatter={(value) => `₹ ${Number(value).toFixed(2)}`}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(160 84% 39%)"
                strokeWidth={2}
                fill="url(#salesGradient)"
                name="Sales"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(217 91% 60%)"
                strokeWidth={2}
                fill="url(#profitGradient)"
                name="Profit"
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="flex justify-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground">Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-sm bg-blue-500" />
              <span className="text-muted-foreground">Profit</span>
            </div>
          </div>
        </Card>
      </section>

      {/* All time + outstanding */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          All time
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total purchases"
            value={money(all_time.total_purchases)}
            icon={Truck}
          />
          <StatCard
            label="Total sales"
            value={money(all_time.total_sales)}
            icon={ShoppingCart}
            accent="emerald"
          />
          <StatCard
            label="Gross profit"
            value={money(all_time.gross_profit)}
            icon={TrendingUp}
            accent="emerald"
          />
          <StatCardLink
            to="/customers"
            label="Owed to us"
            value={money(all_time.owed_to_us)}
            icon={Users}
            accent="red"
          />
          <StatCardLink
            to="/wholesaler-balances"
            label="We owe wholesalers"
            value={money(all_time.we_owe)}
            icon={Truck}
            accent="amber"
          />
          <StatCardLink
            to="/purchase-list"
            label="Planned purchases"
            value={money(all_time.planned_purchase_budget)}
            icon={ClipboardList}
            accent="blue"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "default",
  trend,
  big,
}) {
  const colorMap = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
    default: "text-foreground",
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p
            className={`${
              big ? "text-2xl" : "text-xl"
            } font-semibold mt-1 truncate ${colorMap[accent]}`}
          >
            {value}
          </p>
          {trend != null && !isNaN(trend) && (
            <p
              className={`text-xs mt-1 flex items-center gap-1 ${
                trend >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {Math.abs(trend).toFixed(1)}% vs yesterday
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-md bg-muted p-2">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}

function StatCardLink({ to, label, value, icon, accent }) {
  return (
    <Link to={to}>
      <StatCard label={label} value={value} icon={icon} accent={accent} />
    </Link>
  );
}
