import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSales } from "../api/sales";
import SaleForm from "../components/SaleForm";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Sales() {
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", { dateFrom, dateTo, statusFilter }],
    queryFn: () =>
      listSales({
        dateFrom,
        dateTo,
        paymentStatus: statusFilter || undefined,
      }),
  });

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total_amount), 0);
  const totalDue = sales.reduce((s, x) => s + Number(x.amount_due), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Sales</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Sale
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-3 mb-4 flex flex-wrap gap-3 items-end text-sm">
        <label className="block">
          <span className="block text-xs text-slate-600 mb-1">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-slate-600 mb-1">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-slate-600 mb-1">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">all</option>
            <option value="paid">paid</option>
            <option value="partial">partial</option>
            <option value="unpaid">unpaid</option>
          </select>
        </label>

        <div className="ml-auto flex gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-500">Revenue</span>
            <div className="font-bold text-emerald-700">
              ₹ {totalRevenue.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Cash received</span>
            <div className="font-bold text-slate-800">
              ₹ {sales.reduce((s, x) => s + Number(x.cash_paid), 0).toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500">UPI received</span>
            <div className="font-bold text-slate-800">
              ₹ {sales.reduce((s, x) => s + Number(x.upi_paid), 0).toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Due</span>
            <div className="font-bold text-red-600">
              ₹ {totalDue.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : sales.length === 0 ? (
        <div className="text-slate-500">No sales in this range.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Items</th>
                <th className="text-right px-4 py-2">Total ₹</th>
                <th className="text-right px-4 py-2">Paid ₹</th>
                <th className="text-right px-4 py-2">Due ₹</th>
                <th className="text-left px-4 py-2">Mode</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.sale_date}</td>
                  <td className="px-4 py-2 text-right">
                    {s.items?.length ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    ₹ {Number(s.total_amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    ₹ {Number(s.amount_paid).toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right ${
                      Number(s.amount_due) > 0
                        ? "text-red-600 font-semibold"
                        : "text-slate-400"
                    }`}
                  >
                    ₹ {Number(s.amount_due).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-xs">{s.payment_mode}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        s.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.payment_status === "partial"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {s.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <SaleForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
