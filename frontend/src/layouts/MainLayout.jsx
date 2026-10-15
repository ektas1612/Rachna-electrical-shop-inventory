import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../api/reports";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/products", label: "Products" },
  { to: "/wholesalers", label: "Wholesalers "},
  { to: "/purchases", label: "Purchases "},
  { to: "/sales", label: "Sales" },
  { to: "/switchboards", label: "Switchboards" },
  { to: "/customers", label: "Customers" },
  { to: "/wholesaler-balances", label: "Wholesaler Ledger"},
  { to: "/wholesaler-returns", label: "Wholesaler Returns"},
  // More will be added in later phases:
  // { to: "/purchases", label: "Purchases" },
  
  // { to: "/switchboards", label: "Switch Boards" },
  // { to: "/customers", label: "Credit Customers" },
  // { to: "/reports", label: "Reports" },
];

export default function MainLayout() {
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard({ trendDays: 14 }),
    refetchInterval: 30000, // refresh every 30s as a safety net
  });
  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold text-emerald-400">⚡ Rachna Electricals</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700 text-xs text-slate-400">
          Today's Sales
          <div className="text-emerald-400 font-semibold text-base">₹ {Number(dashboard ?.today?.sales ?? 0).toFixed(2)}</div>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}