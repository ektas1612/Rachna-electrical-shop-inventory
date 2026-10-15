import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listReturns } from "../api/wholesalerReturns";
import { listWholesalers } from "../api/wholesalers";
import WholesalerReturnForm from "../components/WholesalerReturnForm";

export default function WholesalerReturns() {
  const [showForm, setShowForm] = useState(false);
  const [wholesalerFilter, setWholesalerFilter] = useState("");

  const { data: wholesalers = [] } = useQuery({
    queryKey: ["wholesalers"],
    queryFn: () => listWholesalers({}),
  });

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["wholesaler-returns", { wholesalerFilter }],
    queryFn: () =>
      listReturns({
        wholesalerId: wholesalerFilter ? Number(wholesalerFilter) : undefined,
      }),
  });

  const totalReturned = returns.reduce(
    (s, r) => s + Number(r.total_amount),
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Wholesaler Returns
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Return
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-3 mb-4 flex flex-wrap gap-3 items-end text-sm">
        <label className="block">
          <span className="block text-xs text-slate-600 mb-1">Wholesaler</span>
          <select
            value={wholesalerFilter}
            onChange={(e) => setWholesalerFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded"
          >
            <option value="">All wholesalers</option>
            {wholesalers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        {wholesalerFilter && (
          <button
            onClick={() => setWholesalerFilter("")}
            className="text-xs text-slate-500 hover:text-slate-700 underline pb-2"
          >
            Clear
          </button>
        )}
      </div>

      {!isLoading && returns.length > 0 && (
        <div className="text-sm text-slate-600 mb-2">
          Showing <b>{returns.length}</b> return
          {returns.length !== 1 ? "s" : ""} • Total:{" "}
          <b>₹ {totalReturned.toFixed(2)}</b>
        </div>
      )}

      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : returns.length === 0 ? (
        <div className="text-slate-500">No returns yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Wholesaler</th>
                <th className="text-left px-4 py-2">Reference</th>
                <th className="text-right px-4 py-2">Items</th>
                <th className="text-right px-4 py-2">Total ₹</th>
                <th className="text-left px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.return_date}</td>
                  <td className="px-4 py-2 font-medium">
                    {r.wholesaler_name || `#${r.wholesaler_id}`}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.reference || "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.items?.length ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-red-600">
                    ₹ {Number(r.total_amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 truncate max-w-[200px]">
                    {r.notes || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <WholesalerReturnForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}