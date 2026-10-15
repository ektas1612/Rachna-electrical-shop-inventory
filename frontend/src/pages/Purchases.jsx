import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listPurchases } from "../api/purchases";
import { listWholesalers } from "../api/wholesalers";
import PurchaseForm from "../components/PurchaseForm";
import PurchaseDetailModal from "../components/PurchaseDetailModal";

export default function Purchases() {
  const [showForm, setShowForm] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [wholesalerFilter, setWholesalerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: wholesalers = [] } = useQuery({
    queryKey: ["wholesalers"],
    queryFn: () => listWholesalers({}),
  });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", { wholesalerFilter, dateFrom, dateTo }],
    queryFn: () =>
      listPurchases({
        wholesalerId: wholesalerFilter ? Number(wholesalerFilter) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Purchases</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Purchase
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
        <label className="block">
          <span className="block text-xs text-slate-600 mb-1">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-slate-600 mb-1">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded"
          />
        </label>
        {(wholesalerFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setWholesalerFilter("");
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-slate-500 hover:text-slate-700 underline pb-2"
          >
            Clear filters
          </button>
        )}
      </div>
  
      {!isLoading && purchases.length > 0 && (
        <div className="text-sm text-slate-600 mb-2">
          Showing <b>{purchases.length}</b> purchase
          {purchases.length !== 1 ? "s" : ""} • Total:{" "}
          <b>
            ₹{" "}
            {purchases
              .reduce((s, p) => s + Number(p.total_amount), 0)
              .toFixed(2)}
          </b>
        </div>
      )}
  
      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : purchases.length === 0 ? (
        <div className="text-slate-500">No purchases yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Wholesaler</th>
                <th className="text-left px-4 py-2">Receipt #</th>
                <th className="text-right px-4 py-2">Items</th>
                <th className="text-right px-4 py-2">Total ₹</th>
                <th className="text-right px-4 py-2">Paid ₹</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{p.purchase_date}</td>
                  <td className="px-4 py-2 font-medium">
                    {p.wholesaler_name || `#${p.wholesaler_id}`}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {p.receipt_number || "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.items?.length ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    ₹ {Number(p.total_amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    ₹ {Number(p.amount_paid).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setReviewId(p.id)}
                      className="text-emerald-600 hover:underline text-xs"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
  
      {showForm && <PurchaseForm onClose={() => setShowForm(false)} />}
      {reviewId && (
        <PurchaseDetailModal
          purchaseId={reviewId}
          onClose={() => setReviewId(null)}
        />
      )}
    </div>
  );
}
