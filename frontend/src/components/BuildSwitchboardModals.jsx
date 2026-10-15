import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProducts } from "../api/products";
import {
  buildSwitchboard,
  switchboardNameSuggestions,
} from "../api/switchboards";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyLine = { category: "", product_id: "", quantity: 1 };

export default function BuildSwitchboardModal({ onClose }) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [listedPrice, setListedPrice] = useState("");
  const [builtDate, setBuiltDate] = useState(todayISO());
  const [codePrefix, setCodePrefix] = useState("SB");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts({}),
  });

  const { data: nameSuggestions = [] } = useQuery({
    queryKey: ["switchboard-name-suggestions"],
    queryFn: switchboardNameSuggestions,
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

  // Estimated material cost based on latest batch cost per product
  const estimatedCost = useMemo(() => {
    let total = 0;
    for (const line of items) {
      const p = productMap[line.product_id];
      if (!p) continue;
      const qty = Number(line.quantity) || 0;
      const cost = Number(p.latest_cost) || 0;
      total += qty * cost;
    }
    return total;
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
    mutationFn: buildSwitchboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["switchboards"] });
      queryClient.invalidateQueries({ queryKey: ["switchboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["switchboard-name-suggestions"] });
      onClose();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) return setErrorMsg("Give the board a name.");
    if (listedPrice === "" || Number(listedPrice) < 0)
      return setErrorMsg("Enter a valid listed price.");

    for (const [i, line] of items.entries()) {
      if (!line.category) return setErrorMsg(`Line ${i + 1}: pick a category.`);
      if (!line.product_id)
        return setErrorMsg(`Line ${i + 1}: pick a product.`);
      if (Number(line.quantity) <= 0)
        return setErrorMsg(`Line ${i + 1}: quantity must be > 0.`);
      const p = productMap[line.product_id];
      if (p && Number(line.quantity) > Number(p.current_stock))
        return setErrorMsg(
          `Line ${i + 1}: not enough stock for ${p.name}. Available: ${
            p.current_stock
          }.`
        );
    }

    const payload = {
      name: name.trim(),
      listed_price: Number(listedPrice),
      built_date: builtDate,
      code_prefix: codePrefix.trim() || "SB",
      notes: notes.trim() || null,
      components: items.map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
      })),
    };

    mutation.mutate(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 my-8">
        <h3 className="text-lg font-bold mb-4">Build Switchboard</h3>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-4 gap-3">
            <label className="block col-span-2">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Board name *
              </span>
              <input
                list="board-name-suggestions"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 6-module wooden"
                required
                className="w-full border rounded px-2 py-1"
              />
              <datalist id="board-name-suggestions">
                {nameSuggestions.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} (built {s.times_built}×)
                  </option>
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Listed price ₹ *
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={listedPrice}
                onChange={(e) => setListedPrice(e.target.value)}
                required
                className="w-full border rounded px-2 py-1 text-right"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Built date
              </span>
              <input
                type="date"
                value={builtDate}
                onChange={(e) => setBuiltDate(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Code prefix
              </span>
              <input
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block col-span-3">
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

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">
                Components used
              </span>
              <button
                type="button"
                onClick={addLine}
                className="text-emerald-600 hover:underline text-xs"
              >
                + Add component
              </button>
            </div>

            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left px-2 py-2 w-32">Category</th>
                    <th className="text-left px-2 py-2">Product</th>
                    <th className="text-right px-2 py-2 w-24">Qty</th>
                    <th className="text-right px-2 py-2 w-24">Stock</th>
                    <th className="text-right px-2 py-2 w-28">Est. cost</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((line, i) => {
                    const p = productMap[line.product_id];
                    const qty = Number(line.quantity) || 0;
                    const cost = p ? Number(p.latest_cost) || 0 : 0;
                    const lineCost = qty * cost;
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
                        <td className="px-2 py-1 text-right text-xs text-slate-600">
                          ₹ {lineCost.toFixed(2)}
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
                    <td colSpan={4} className="px-2 py-2 text-right text-xs text-slate-600">
                      Estimated material cost
                    </td>
                    <td className="px-2 py-2 text-right font-bold">
                      ₹ {estimatedCost.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Est. cost uses the latest FIFO cost per product. The actual cost
              recorded on save uses FIFO consumption and may differ slightly.
            </p>
          </div>

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
              {mutation.isPending ? "Building…" : "Build Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}