import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listWholesalers } from "../api/wholesalers";
import { listProducts } from "../api/products";
import { createReturn } from "../api/wholesalerReturns";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isWeekend(isoDate) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const dow = d.getDay(); // 0 = Sunday, 6 = Saturday
  return dow === 0 || dow === 6;
}

const emptyLine = { category: "", product_id: "", quantity: 1, unit_price: "" };

export default function WholesalerReturnForm({ onClose }) {
  const queryClient = useQueryClient();

  const [wholesalerId, setWholesalerId] = useState("");
  const [returnDate, setReturnDate] = useState(todayISO());
  const [reference, setReference] = useState("");
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

  const total = useMemo(() => {
    return items.reduce((s, line) => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unit_price) || 0;
      return s + qty * price;
    }, 0);
  }, [items]);

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
    mutationFn: createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesaler-returns"] });
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

    if (!wholesalerId) return setErrorMsg("Pick a wholesaler.");

    for (const [i, line] of items.entries()) {
      if (!line.category) return setErrorMsg(`Line ${i + 1}: pick a category.`);
      if (!line.product_id) return setErrorMsg(`Line ${i + 1}: pick a product.`);
      if (Number(line.quantity) <= 0)
        return setErrorMsg(`Line ${i + 1}: quantity must be > 0.`);
      if (line.unit_price === "" || Number(line.unit_price) < 0)
        return setErrorMsg(`Line ${i + 1}: enter a valid unit price.`);
      const p = productMap[line.product_id];
      if (p && Number(line.quantity) > Number(p.current_stock))
        return setErrorMsg(
          `Line ${i + 1}: not enough stock for ${p.name}. Available: ${p.current_stock}.`
        );
    }

    const payload = {
      wholesaler_id: Number(wholesalerId),
      return_date: returnDate,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      items: items.map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
      })),
    };

    mutation.mutate(payload);
  }

  const weekdayWarning = returnDate && !isWeekend(returnDate);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 my-8">
        <h3 className="text-lg font-bold mb-4">New Wholesaler Return</h3>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
            {errorMsg}
          </div>
        )}

        {weekdayWarning && (
          <div className="bg-amber-50 text-amber-800 text-sm p-2 rounded mb-3 border border-amber-200">
            ⚠ Returns are usually done on Saturdays / Sundays. You're entering a{" "}
            {new Date(returnDate).toLocaleDateString("en-IN", {
              weekday: "long",
            })}
            . It's fine to continue.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                Date *
              </span>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
                className="w-full border rounded px-2 py-1"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Reference #
              </span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">
                Returned items
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
                    <th className="text-left px-2 py-2 w-32">Category</th>
                    <th className="text-left px-2 py-2">Product</th>
                    <th className="text-right px-2 py-2 w-24">Qty</th>
                    <th className="text-right px-2 py-2 w-20">Stock</th>
                    <th className="text-right px-2 py-2 w-28">Unit ₹</th>
                    <th className="text-right px-2 py-2 w-28">Line ₹</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((line, i) => {
                    const p = productMap[line.product_id];
                    const qty = Number(line.quantity) || 0;
                    const price = Number(line.unit_price) || 0;
                    const lineTotal = qty * price;
                    const overStock = p && qty > Number(p.current_stock);

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
                            {productsInCategory(line.category).map((prod) => (
                              <option key={prod.id} value={prod.id}>
                                {prod.name}
                                {prod.brand ? ` (${prod.brand})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(i, { quantity: e.target.value })
                            }
                            className={`w-full border rounded px-1 py-1 text-right ${
                              overStock ? "border-red-500" : ""
                            }`}
                          />
                        </td>
                        <td
                          className={`px-2 py-1 text-right text-xs ${
                            overStock
                              ? "text-red-600 font-bold"
                              : "text-slate-500"
                          }`}
                        >
                          {p ? Number(p.current_stock) : "—"}
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

            <p className="text-xs text-slate-500 mt-1">
              Stock will be reduced from the newest batches first. This return
              amount reduces what you owe the wholesaler.
            </p>
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
              className="px-4 py-2 rounded border text-slate-700 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Save Return"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}