import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listWholesalers } from "../api/wholesalers";
import { listProducts } from "../api/products";
import { createPurchase } from "../api/purchases";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyLine = {
  category: "",
  product_id: "",
  quantity_bought: 1,
  unit_used: "box",
  unit_price: "",
};

export default function PurchaseForm({ onClose }) {
  const queryClient = useQueryClient();

  const [wholesalerId, setWholesalerId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [cashPaid, setCashPaid] = useState(0);
  const [upiPaid, setUpiPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: wholesalers = [] } = useQuery({
    queryKey: ["wholesalers"],
    queryFn: () => listWholesalers({}),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts({}),
  });

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  const categoryList = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);
  
  const productsInCategory = (cat) =>
    products.filter((p) => p.category === cat);

  // Compute running total
  const total = useMemo(() => {
    return items.reduce((sum, line) => {
      const product = productMap[line.product_id];
      if (!product) return sum;
      const qty = Number(line.quantity_bought) || 0;
      const price = Number(line.unit_price) || 0;
      let pieces = qty;
      if (line.unit_used === "box")
        pieces = qty * (product.pieces_per_box || 1);
      return sum + pieces * price;
    }, 0);
  }, [items, productMap]);

  function updateLine(index, patch) {
    setItems((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l))
    );
  }

  function addLine() {
    setItems((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const mutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["wholesaler-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!wholesalerId) return setErrorMsg("Please pick a wholesaler.");
    if (items.length === 0) return setErrorMsg("Add at least one item.");

    for (const [i, line] of items.entries()) {
      if (!line.category) 
        return setErrorMsg(`Line ${i + 1}: pick a category.`);
      if (!line.product_id)
        return setErrorMsg(`Line ${i + 1}: pick a product.`);
      if (Number(line.quantity_bought) <= 0)
        return setErrorMsg(`Line ${i + 1}: quantity must be > 0.`);
      if (line.unit_price === "" || Number(line.unit_price) < 0)
        return setErrorMsg(`Line ${i + 1}: enter a valid unit price.`);
      if (!line.category) 
        return setErrorMsg(`Line ${i + 1}: pick a category.`);
    }

    const payload = {
      wholesaler_id: Number(wholesalerId),
      receipt_number: receiptNumber.trim() || null,
      purchase_date: purchaseDate,
      amount_paid: Number(amountPaid) || 0,
      payment_mode: paymentMode,
      cash_paid: Number(cashPaid) || 0,
      upi_paid: Number(upiPaid) || 0,
      notes: notes.trim() || null,
      items: items.map((l) => ({
        product_id: Number(l.product_id),
        quantity_bought: Number(l.quantity_bought),
        unit_used: l.unit_used,
        unit_price: Number(l.unit_price),
      })),
    };

    mutation.mutate(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 my-8">
        <h3 className="text-lg font-bold mb-4">New Purchase</h3>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header row */}
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Wholesaler *
              </span>
              <select
                value={wholesalerId}
                onChange={(e) => setWholesalerId(e.target.value)}
                required
                className="w-full border rounded px-2 py-1"
              >
                <option value="">— Select —</option>
                {wholesalers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Receipt #
              </span>
              <input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Date *
              </span>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className="w-full border rounded px-2 py-1"
              />
            </label>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">
                Items
              </span>
              <button
                type="button"
                onClick={addLine}
                className="text-emerald-600 hover:underline text-xs"
              >
                + Add line
              </button>
            </div>

            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left px-2 py-2">Category</th>
                    <th className="text-left px-2 py-2">Product</th>
                    <th className="text-right px-2 py-2 w-24">Qty</th>
                    <th className="text-left px-2 py-2 w-24">Unit</th>
                    <th className="text-right px-2 py-2 w-28">Price /pc</th>
                    <th className="text-right px-2 py-2 w-28">Line ₹</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((line, i) => {
                    const product = productMap[line.product_id];
                    const qty = Number(line.quantity_bought) || 0;
                    const price = Number(line.unit_price) || 0;
                    const pieces =
                      line.unit_used === "box"
                        ? qty * (product?.pieces_per_box || 1)
                        : qty;
                    const lineTotal = pieces * price;

                    return (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-1">
                          <select
                            value={line.category}
                            onChange={(e) =>
                              updateLine(i, {
                                category: e.target.value,
                                product_id: "",
                              })
                            }
                            className="w-full border rounded px-1 py-1"
                          >
                            <option value="">— Category —</option>
                            {categoryList.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={line.product_id}
                            onChange={(e) =>
                              updateLine(i, {
                                product_id: e.target.value
                                  ? Number(e.target.value)
                                  : "",
                              })
                            }
                            disabled={!line.category}
                            className="w-full border rounded px-1 py-1 disabled:bg-slate-100"
                          >
                            <option value="">
                              {line.category
                                ? "— Select product —"
                                : "Pick category first"}
                            </option>
                            {productsInCategory(line.category).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                                {p.brand ? ` (${p.brand})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity_bought}
                            onChange={(e) =>
                              updateLine(i, { quantity_bought: e.target.value })
                            }
                            className="w-full border rounded px-1 py-1 text-right"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={line.unit_used}
                            onChange={(e) =>
                              updateLine(i, { unit_used: e.target.value })
                            }
                            className="w-full border rounded px-1 py-1"
                          >
                            <option value="piece">piece</option>
                            <option value="box">box</option>
                            <option value="meter">meter</option>
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) =>
                              updateLine(i, { unit_price: e.target.value })
                            }
                            className="w-full border rounded px-1 py-1 text-right"
                          />
                        </td>
                        <td className="px-2 py-1 text-right font-medium">
                          ₹ {lineTotal.toFixed(2)}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              className="text-red-500 hover:text-red-700 text-xs"
                              title="Remove"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td
                      colSpan={5}
                      className="px-2 py-2 text-right font-semibold"
                    >
                      Total
                    </td>
                    <td className="px-2 py-2 text-right font-bold">
                      ₹ {total.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Amount paid ₹
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full border rounded px-2 py-1 text-right"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Mode
              </span>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="cash">cash</option>
                <option value="upi">upi</option>
                <option value="mixed">mixed</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Cash ₹
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value)}
                disabled={paymentMode !== "mixed" && paymentMode !== "cash"}
                className="w-full border rounded px-2 py-1 text-right disabled:bg-slate-100"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                UPI ₹
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={upiPaid}
                onChange={(e) => setUpiPaid(e.target.value)}
                disabled={paymentMode !== "mixed" && paymentMode !== "upi"}
                className="w-full border rounded px-2 py-1 text-right disabled:bg-slate-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border rounded px-2 py-1"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border text-slate-700 hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Save Purchase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
