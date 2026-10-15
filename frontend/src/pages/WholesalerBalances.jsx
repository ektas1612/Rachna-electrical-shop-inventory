import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBalances, createPayment } from "../api/purchases";
import { Link } from "react-router-dom";

export default function WholesalerBalances() {
  const queryClient = useQueryClient();

  // ---- Balances query ----
  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["wholesaler-balances"],
    queryFn: listBalances,
  });

  // ---- Payment modal state ----
  const [showPayment, setShowPayment] = useState(false);
  const [payWholesalerId, setPayWholesalerId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const paymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesaler-balances"] });
      setShowPayment(false);
      setPayWholesalerId("");
      setPayAmount("");
      setPayMode("cash");
      setPayNotes("");
      setErrMsg("");
    },
    onError: (e) => setErrMsg(e.message),
  });

  function openPayment() {
    setPayWholesalerId("");
    setPayAmount("");
    setPayMode("cash");
    setPayNotes("");
    setErrMsg("");
    setShowPayment(true);
  }

  function handlePaySubmit(e) {
    e.preventDefault();
    setErrMsg("");
    if (!payWholesalerId) return setErrMsg("Pick a wholesaler.");
    if (!payAmount || Number(payAmount) <= 0)
      return setErrMsg("Enter a positive amount.");

    paymentMutation.mutate({
      wholesaler_id: Number(payWholesalerId),
      amount: Number(payAmount),
      payment_mode: payMode,
      notes: payNotes.trim() || null,
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Wholesaler Ledger</h2>
        <button
          onClick={openPayment}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Record Payment
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : balances.length === 0 ? (
        <div className="text-slate-500">No wholesalers yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-right px-4 py-2">Opening ₹</th>
                <th className="text-left px-4 py-2">Wholesaler</th>
                <th className="text-right px-4 py-2">Total Purchased ₹</th>
                <th className="text-right px-4 py-2">Total Paid ₹</th>
                <th className="text-right px-4 py-2">Balance ₹</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => {
                const bal = Number(b.balance);
                const isRed = bal > 0;
                const isGreen = bal < 0;
                return (
                  <tr
                    key={b.wholesaler_id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-2 font-medium">
                      <Link
                        to={`/wholesaler-ledger/${b.wholesaler_id}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {b.wholesaler_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {Number(b.opening_balance || 0) !== 0
                        ? `₹ ${Number(b.opening_balance).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      ₹ {Number(b.total_purchased).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      ₹ {Number(b.total_paid).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      ₹ {Math.abs(bal).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {isRed && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          You owe
                        </span>
                      )}
                      {isGreen && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          Advance (they owe you)
                        </span>
                      )}
                      {!isRed && !isGreen && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-3">Record Payment</h3>

            {errMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
                {errMsg}
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Wholesaler *
                </span>
                <select
                  value={payWholesalerId}
                  onChange={(e) => setPayWholesalerId(e.target.value)}
                  required
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">— Select —</option>
                  {balances.map((b) => (
                    <option key={b.wholesaler_id} value={b.wholesaler_id}>
                      {b.wholesaler_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Amount ₹ *
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="w-full border rounded px-2 py-1 text-right"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Mode
                </span>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="cash">cash</option>
                  <option value="upi">upi</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Notes
                </span>
                <input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPayment(false)}
                  className="px-3 py-1.5 rounded border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
                >
                  {paymentMutation.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
