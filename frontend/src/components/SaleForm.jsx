import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProducts } from "../api/products";
import { createSale } from "../api/sales";
import { listCustomers, createCustomer } from "../api/customers";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyLine = {
  category: "",
  product_id: "",
  quantity: 1,
  actual_price: "",
};

export default function SaleForm({ onClose }) {
  const queryClient = useQueryClient();

  const [saleDate, setSaleDate] = useState(todayISO());
  const [cashPaid, setCashPaid] = useState(0);
  const [upiPaid, setUpiPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [errorMsg, setErrorMsg] = useState("");
  const [paidInFull, setPaidInFull] = useState(true);
  const [payMethod, setPayMethod] = useState("cash"); // cash | upi | mixed
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedUpi, setMixedUpi] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts({}),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers({}),
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

  // Live totals
  const { subtotalListed, totalActual } = useMemo(() => {
    let sub = 0,
      tot = 0;
    for (const line of items) {
      const p = productMap[line.product_id];
      if (!p) continue;
      const qty = Number(line.quantity) || 0;
      const actual = Number(line.actual_price) || 0;
      sub += qty * Number(p.selling_price);
      tot += qty * actual;
    }
    return { subtotalListed: sub, totalActual: tot };
  }, [items, productMap]);

  // Derive cash/upi based on mode
  let derivedCash = 0;
  let derivedUpi = 0;

  if (paidInFull) {
    if (payMethod === "cash") derivedCash = totalActual;
    else if (payMethod === "upi") derivedUpi = totalActual;
    else {
      derivedCash = Number(mixedCash) || 0;
      derivedUpi = Number(mixedUpi) || 0;
    }
  } else {
    // Partial/unpaid — user edits both freely
    derivedCash = Number(mixedCash) || 0;
    derivedUpi = Number(mixedUpi) || 0;
  }

  const totalPaid = derivedCash + derivedUpi;
  const amountDue = Math.max(0, totalActual - totalPaid);

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

  // When a product is picked, auto-fill actual_price with its listed price
  function pickProduct(index, productId) {
    const p = productMap[productId];
    updateLine(index, {
      product_id: productId,
      actual_price: p ? Number(p.selling_price) : "",
    });
  }

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["today-sales"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (items.length === 0) return setErrorMsg("Add at least one item.");

    for (const [i, line] of items.entries()) {
      if (!line.category) return setErrorMsg(`Line ${i + 1}: pick a category.`);
      if (!line.product_id)
        return setErrorMsg(`Line ${i + 1}: pick a product.`);
      if (Number(line.quantity) <= 0)
        return setErrorMsg(`Line ${i + 1}: quantity must be > 0.`);
      if (line.actual_price === "" || Number(line.actual_price) < 0)
        return setErrorMsg(`Line ${i + 1}: enter a valid price.`);
      const p = productMap[line.product_id];
      if (p && Number(line.quantity) > Number(p.current_stock))
        return setErrorMsg(
          `Line ${i + 1}: not enough stock for ${p.name}. Available: ${
            p.current_stock
          }.`
        );
      if (!paidInFull || totalPaid < totalActual) {
        if (!customerId) {
          return setErrorMsg(
            "A customer is required when payment is partial or unpaid."
          );
        }
      }
    }

    if (paidInFull) {
      if (payMethod === "mixed" && totalPaid !== totalActual) {
        return setErrorMsg(
          `Mixed payment must add up to the total (₹${totalActual.toFixed(
            2
          )}). Currently ₹${totalPaid.toFixed(2)}.`
        );
      }
    } else {
      if (totalPaid > totalActual) {
        return setErrorMsg(
          `Paid (₹${totalPaid.toFixed(
            2
          )}) exceeds total (₹${totalActual.toFixed(2)}).`
        );
      }
    }

    const payload = {
      sale_date: saleDate,
      cash_paid: derivedCash,
      upi_paid: derivedUpi,
      customer_id: customerId ? Number(customerId) : null,
      notes: notes.trim() || null,
      items: items.map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        actual_price: Number(l.actual_price),
      })),
    };

    mutation.mutate(payload);
  }

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerId(newCustomer.id);
      setShowNewCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function handleCreateCustomer() {
    if (!newCustomerName.trim()) return setErrorMsg("Enter customer name.");
    createCustomerMutation.mutate({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 my-8">
        <h3 className="text-lg font-bold mb-4">New Sale</h3>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Date *
              </span>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                className="w-full border rounded px-2 py-1"
              />
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
                    <th className="text-left px-2 py-2 w-32">Category</th>
                    <th className="text-left px-2 py-2">Product</th>
                    <th className="text-right px-2 py-2 w-24">Qty</th>
                    <th className="text-right px-2 py-2 w-32">Listed ₹</th>
                    <th className="text-right px-2 py-2 w-32">Sold @ ₹</th>
                    <th className="text-right px-2 py-2 w-28">Line ₹</th>
                    <th className="text-right px-2 py-2 w-20">Stock</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((line, i) => {
                    const p = productMap[line.product_id];
                    const qty = Number(line.quantity) || 0;
                    const actual = Number(line.actual_price) || 0;
                    const lineTotal = qty * actual;
                    const listed = p ? Number(p.selling_price) : 0;
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
                                actual_price: "",
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
                              pickProduct(
                                i,
                                e.target.value ? Number(e.target.value) : ""
                              )
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
                                {prod.brand ? ` (${prod.brand})` : ""} — ₹
                                {Number(prod.selling_price).toFixed(2)}
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
                        <td className="px-2 py-1 text-right text-slate-500">
                          {listed.toFixed(2)}
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.actual_price}
                            onChange={(e) =>
                              updateLine(i, { actual_price: e.target.value })
                            }
                            className="w-full border rounded px-1 py-1 text-right"
                          />
                        </td>
                        <td className="px-2 py-1 text-right font-medium">
                          ₹ {lineTotal.toFixed(2)}
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
                      className="px-2 py-2 text-right text-xs text-slate-600"
                    >
                      Subtotal (listed): ₹ {subtotalListed.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right font-bold">
                      ₹ {totalActual.toFixed(2)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment */}
          <div className="border rounded-lg p-3 bg-slate-50">
            {/* Mode toggle */}
            <div className="flex items-center gap-4 mb-3">
              <span className="text-xs font-semibold text-slate-700">
                Payment:
              </span>
              <div className="inline-flex rounded border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setPaidInFull(true)}
                  className={`px-3 py-1 ${
                    paidInFull
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Paid in full
                </button>
                <button
                  type="button"
                  onClick={() => setPaidInFull(false)}
                  className={`px-3 py-1 border-l ${
                    !paidInFull
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Partial / Unpaid
                </button>
              </div>
            </div>

            {/* Method selector */}
            <div className="flex items-center gap-2 mb-3 text-sm">
              <span className="text-xs font-semibold text-slate-700">
                Method:
              </span>
              {["cash", "upi", "mixed"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`px-3 py-1 rounded text-xs border ${
                    payMethod === m
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Amount inputs — only when needed */}
            {(payMethod === "mixed" || !paidInFull) && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-600 mb-1">
                    Cash ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mixedCash}
                    onChange={(e) => setMixedCash(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-right"
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
                    value={mixedUpi}
                    onChange={(e) => setMixedUpi(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-right"
                  />
                </label>
              </div>
            )}

            {/* Summary line */}
            <div className="text-sm bg-white rounded px-3 py-2 flex justify-between border">
              <span>
                Paid: <b>₹ {totalPaid.toFixed(2)}</b>
              </span>
              <span
                className={
                  amountDue > 0
                    ? "text-red-600 font-bold"
                    : "text-emerald-600 font-semibold"
                }
              >
                Due: <b>₹ {amountDue.toFixed(2)}</b>
              </span>
            </div>

            {/* Customer picker — only shown when not fully paid */}
            {!paidInFull || totalPaid < totalActual ? (
              <div className="mt-3 border-t pt-3">
                <span className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer * (required when payment is partial/unpaid)
                </span>

                {!showNewCustomer ? (
                  <div className="flex gap-2">
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    >
                      <option value="">— Select customer —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.phone ? ` (${c.phone})` : ""}
                          {c.outstanding != null && Number(c.outstanding) !== 0
                            ? ` — owes ₹${Number(c.outstanding).toFixed(2)}`
                            : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomer(true)}
                      className="text-emerald-600 hover:underline text-xs whitespace-nowrap"
                    >
                      + New
                    </button>
                  </div>
                ) : (
                  <div className="border rounded p-2 bg-white space-y-2">
                    <input
                      autoFocus
                      placeholder="Customer name *"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                    <input
                      placeholder="Phone (optional)"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCustomer(false);
                          setNewCustomerName("");
                          setNewCustomerPhone("");
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateCustomer}
                        disabled={createCustomerMutation.isPending}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        {createCustomerMutation.isPending ? "Saving…" : "Add"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Quick-fill helpers when full paid by cash/upi */}
            {paidInFull && payMethod !== "mixed" && (
              <div className="text-xs text-slate-500 mt-2">
                Will record <b>₹ {totalActual.toFixed(2)}</b> as{" "}
                {payMethod.toUpperCase()}.
              </div>
            )}
          </div>

          {amountDue > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠ This sale will be marked <b>unpaid/partial</b> for ₹
              {amountDue.toFixed(2)}.
            </div>
          )}

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
              {mutation.isPending ? "Saving…" : "Save Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
