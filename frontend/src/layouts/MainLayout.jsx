import { NavLink, Outlet, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  Receipt,
  Wrench,
  Users,
  Wallet,
  Undo2,
  Zap,
  Plus,
  Moon,
  Sun,
  ClipboardList,
} from "lucide-react";

import { getDashboard } from "../api/reports";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import BackupButton from "../components/BackupButton";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/wholesalers", label: "Wholesalers", icon: Truck },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/purchase-list", label: "Purchase List", icon: ClipboardList },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/switchboards", label: "Switchboards", icon: Wrench },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/wholesaler-balances", label: "Wholesaler Ledger", icon: Wallet },
  { to: "/wholesaler-returns", label: "Wholesaler Returns", icon: Undo2 },
];

export default function MainLayout() {
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard", { trendDays: 14 }],
    queryFn: () => getDashboard({ trendDays: 14 }),
    refetchInterval: 30000,
  });

  const todaySales = Number(dashboard?.today?.sales ?? 0);
  const todayCash = Number(dashboard?.today?.cash_collected ?? 0);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="h-screen flex bg-muted/40 overflow-hidden">
      <aside className="w-60 h-screen bg-slate-900 text-slate-100 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <div className="rounded-md bg-emerald-500 p-1.5">
            <Zap className="size-4 text-white" />
          </div>
          <h1 className="text-sm font-semibold text-white flex-1 truncate">
            Rachna Electricals
          </h1>
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-slate-400 hover:text-white transition-colors"
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white font-medium"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-3">
          <Link
            to="/sales?new=1"
            className="flex items-center justify-center gap-2 w-full px-3 py-3 rounded-md text-base bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-md"
          >
            <Plus className="size-5 shrink-0" />
            <span>New Sale</span>
          </Link>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
              Today
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Sales</span>
              <span className="text-sm font-semibold text-emerald-400">
                ₹ {todaySales.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xs text-slate-400">Collected</span>
              <span className="text-xs font-medium text-slate-200">
                ₹ {todayCash.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">To order</span>
            <span className="text-xs font-medium text-blue-400">
              ₹{" "}
              {Number(
                dashboard?.all_time?.planned_purchase_budget ?? 0
              ).toFixed(2)}
            </span>
          </div>
          <BackupButton />
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
