import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCustomer,
  getCustomerLedger,
  recordCreditPayment,
} from "../api/customers";

export default function CustomerLedger() {
  const { id } = useParams();
  const customerId = Number(id);
  const queryClient = useQueryClient();

  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(customerId),
  });

  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ["customer-ledger", customerId],
    queryFn: () => getCustomerLedger(customerId),
  });

  const mutation = useMutation({
    mutationFn: recordCreditPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-ledger", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowPayment(false);
      setAmount("");
      setNotes("");
      setErrorMsg("");
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function handlePaySubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!amount || Number(amount) <= 0)
      return setErrorMsg("Enter a positive amount.");
    mutation.mutate({
      customer_id: customerId,
      amount: Number(amount),
      payment_mode: mode,
      notes: notes.trim() || null,
    });
  }

  const outstanding = Number(customer?.outstanding) || 0;

  return (
    <div>
      <div className="mb-4">
        <Link to="/customers" className="text-emerald-600 text-sm hover:underline">
          ← Back to Customers
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {customer?.name || `Customer #${customerId}`}
          </h2>
          {customer?.phone && (
            <div className="text-sm text-slate-500">{customer.phone}</div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-500">Outstanding</span>
            <div
              className={`text-lg font-bold ${
                outstanding > 0
                  ? "text-red-600"
                  : outstanding < 0
                  ? "text-emerald-600"
                  : "text-slate-500"
              }`}
            >
              ₹ {Math.abs(outstanding).toFixed(2)}
              {outstanding < 0 && (
                <span className="text-xs font-normal ml-1">(advance)</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
          >
            + Record Payment
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : ledger.length === 0 ? (
        <div className="text-slate-500">No ledger entries yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-right px-3 py-2">Debit (sale) ₹</th>
                <th className="text-right px-3 py-2">Credit (paid) ₹</th>
                <th className="text-right px-3 py-2">Balance ₹</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">
                    {row.kind === "sale" ? (
                      <Link
                        to={`/sales`}
                        className="text-slate-700 hover:underline"
                      >
                        {row.description}
                      </Link>
                    ) : (
                      row.description
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {Number(row.debit) > 0
                      ? `₹ ${Number(row.debit).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-700">
                    {Number(row.credit) > 0
                      ? `₹ ${Number(row.credit).toFixed(2)}`
                      : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      Number(row.running_balance) > 0
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    ₹ {Math.abs(Number(row.running_balance)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-3">Record Payment</h3>
            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handlePaySubmit} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Amount ₹ *
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full border rounded px-2 py-1 text-right"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Mode
                </span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
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
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayment(false)}
                  className="px-3 py-1.5 rounded border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
                >
                  {mutation.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}