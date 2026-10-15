import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "../api/customers";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("outstanding"); // outstanding | name

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", { search }],
    queryFn: () => listCustomers({ search }),
  });

  const sorted = [...customers].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    // outstanding: biggest debtor first
    return (Number(b.outstanding) || 0) - (Number(a.outstanding) || 0);
  });

  const totalOwed = customers.reduce(
    (s, c) => s + Math.max(0, Number(c.outstanding) || 0),
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
        <div className="text-sm">
          <span className="text-xs text-slate-500">Total owed to us</span>
          <div className="text-lg font-bold text-red-600">
            ₹ {totalOwed.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded text-sm"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm"
        >
          <option value="outstanding">Sort: biggest debtor first</option>
          <option value="name">Sort: by name</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="text-slate-500">
          No customers yet. They are created during a partial/unpaid sale.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Phone</th>
                <th className="text-right px-4 py-2">Outstanding ₹</th>
                <th className="text-right px-4 py-2 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const out = Number(c.outstanding) || 0;
                return (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">
                      <Link
                        to={`/customers/${c.id}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {c.phone || "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {out > 0 && (
                        <span className="font-semibold text-red-600">
                          ₹ {out.toFixed(2)}
                        </span>
                      )}
                      {out === 0 && (
                        <span className="text-slate-400">₹ 0.00</span>
                      )}
                      {out < 0 && (
                        <span className="font-semibold text-emerald-600">
                          Advance ₹ {Math.abs(out).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <Link
                        to={`/customers/${c.id}`}
                        className="text-slate-700 hover:underline text-xs"
                      >
                        Ledger
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}