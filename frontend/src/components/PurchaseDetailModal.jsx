import { useQuery } from "@tanstack/react-query";
import { getPurchase } from "../api/purchases";

export default function PurchaseDetailModal({ purchaseId, onClose }) {
  const { data: purchase, isLoading, error } = useQuery({
    queryKey: ["purchase", purchaseId],
    queryFn: () => getPurchase(purchaseId),
    enabled: !!purchaseId,
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Purchase Details</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="text-slate-500">Loading…</div>
        ) : error ? (
          <div className="text-red-600">Failed to load purchase.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4 text-sm">
              <Info label="Date" value={purchase.purchase_date} />
              <Info
                label="Wholesaler"
                value={purchase.wholesaler_name || `#${purchase.wholesaler_id}`}
              />
              <Info label="Receipt #" value={purchase.receipt_number || "—"} />
              <Info
                label="Total"
                value={`₹ ${Number(purchase.total_amount).toFixed(2)}`}
              />
              <Info
                label="Paid"
                value={`₹ ${Number(purchase.amount_paid).toFixed(2)}`}
              />
              <Info label="Mode" value={purchase.payment_mode} />
              <Info
                label="Cash / UPI"
                value={`₹ ${Number(purchase.cash_paid).toFixed(2)} / ₹ ${Number(
                  purchase.upi_paid
                ).toFixed(2)}`}
              />
              <Info
                label="Due on this bill"
                value={
                  <span
                    className={
                      Number(purchase.amount_paid) <
                      Number(purchase.total_amount)
                        ? "text-red-600 font-semibold"
                        : "text-emerald-600"
                    }
                  >
                    ₹{" "}
                    {(
                      Number(purchase.total_amount) -
                      Number(purchase.amount_paid)
                    ).toFixed(2)}
                  </span>
                }
              />
            </div>

            {purchase.notes && (
              <div className="mb-4 text-sm">
                <span className="text-slate-500">Notes: </span>
                <span>{purchase.notes}</span>
              </div>
            )}

            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">Product</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-left px-3 py-2">Unit</th>
                    <th className="text-right px-3 py-2">Pieces</th>
                    <th className="text-right px-3 py-2">Price / pc</th>
                    <th className="text-right px-3 py-2">Line ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {!purchase.items || purchase.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-slate-500 py-3"
                      >
                        No items recorded on this bill.
                      </td>
                    </tr>
                  ) : (
                    purchase.items.map((it) => (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="px-3 py-1">
                          {it.product_name || `Product #${it.product_id}`}
                        </td>
                        <td className="px-3 py-1 text-right">
                          {Number(it.quantity_bought)}
                        </td>
                        <td className="px-3 py-1">{it.unit_used}</td>
                        <td className="px-3 py-1 text-right">
                          {Number(it.quantity_in_pieces)}
                        </td>
                        <td className="px-3 py-1 text-right">
                          ₹ {Number(it.unit_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-1 text-right font-medium">
                          ₹ {Number(it.line_total).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border text-slate-700 hover:bg-slate-50 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <div className="font-medium">{value}</div>
    </div>
  );
}