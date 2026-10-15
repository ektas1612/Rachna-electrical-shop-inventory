import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listPurchases, listPayments } from "../api/purchases";
import { listWholesalers } from "../api/wholesalers";
import PurchaseDetailModal from "../components/PurchaseDetailModal";

export default function WholesalerLedger() {
  const { id } = useParams();
  const wholesalerId = Number(id);
  const [reviewId, setReviewId] = useState(null);

  const { data: wholesalers = [] } = useQuery({
    queryKey: ["wholesalers"],
    queryFn: () => listWholesalers({}),
  });
  const wholesaler = wholesalers.find((w) => w.id === wholesalerId);

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", { wholesalerId }],
    queryFn: () => listPurchases({ wholesalerId }),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", { wholesalerId }],
    queryFn: () => listPayments({ wholesalerId }),
  });

  const ledger = useMemo(() => {
    const rows = [];
    for (const p of purchases) {
      rows.push({
        key: `p-${p.id}`,
        date: p.purchase_date,
        kind: "purchase",
        receipt: p.receipt_number || "—",
        order_amount: Number(p.total_amount),
        payment_amount: Number(p.amount_paid),
        ref_id: p.id,
        notes: p.notes,
      });
    }
    for (const pmt of payments) {
      rows.push({
        key: `pmt-${pmt.id}`,
        date: pmt.payment_date?.slice(0, 10),
        kind: "payment",
        receipt: "—",
        order_amount: 0,
        payment_amount: Number(pmt.amount),
        ref_id: pmt.id,
        notes: pmt.notes,
      });
    }
    rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let runningOrder = 0;
    let runningPayment = 0;
    for (const r of rows) {
      runningOrder += r.order_amount;
      runningPayment += r.payment_amount;
      r.running_order = runningOrder;
      r.running_payment = runningPayment;
      r.balance = runningOrder - runningPayment;
    }
    return rows;
  }, [purchases, payments]);

  const opening = Number(wholesaler?.opening_balance || 0);
  const totalOrder = ledger.length
    ? ledger[ledger.length - 1].running_order
    : 0;
  const totalPayment = ledger.length
    ? ledger[ledger.length - 1].running_payment
    : 0;
  const finalBalance = opening + totalOrder - totalPayment;

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/wholesaler-balances"
          className="text-emerald-600 text-sm hover:underline"
        >
          ← Back to Wholesaler Ledger
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {wholesaler?.name || `Wholesaler #${wholesalerId}`}
        </h2>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-xs text-slate-500">Total ordered</span>
            <div className="font-bold">₹ {totalOrder.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Total paid</span>
            <div className="font-bold">₹ {totalPayment.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Balance</span>
            <div
              className={`font-bold ${
                finalBalance > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              ₹ {Math.abs(finalBalance).toFixed(2)}{" "}
              <span className="text-xs font-normal">
                {finalBalance > 0 ? "(we owe)" : "(advance)"}
              </span>
            </div>
          </div>
        </div>
      </div>
      {opening !== 0 && (
        <div className="text-xs text-slate-500 mb-2">
          Includes opening balance of ₹ {opening.toFixed(2)}{" "}
          {opening > 0 ? "(we owed them)" : "(advance)"}
        </div>
      )}

      {ledger.length === 0 ? (
        <div className="text-slate-500">No transactions yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Receipt #</th>
                <th className="text-right px-3 py-2">Order ₹</th>
                <th className="text-right px-3 py-2">Payment ₹</th>
                <th className="text-right px-3 py-2">Balance ₹</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="text-right px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((r) => (
                <tr key={r.key} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        r.kind === "purchase"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {r.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.receipt}</td>
                  <td className="px-3 py-2 text-right">
                    {r.order_amount > 0
                      ? `₹ ${r.order_amount.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.payment_amount > 0
                      ? `₹ ${r.payment_amount.toFixed(2)}`
                      : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      r.balance > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    ₹ {Math.abs(r.balance).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 truncate max-w-[160px]">
                    {r.notes || ""}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.kind === "purchase" && (
                      <button
                        onClick={() => setReviewId(r.ref_id)}
                        className="text-emerald-600 hover:underline text-xs"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewId && (
        <PurchaseDetailModal
          purchaseId={reviewId}
          onClose={() => setReviewId(null)}
        />
      )}
    </div>
  );
}
