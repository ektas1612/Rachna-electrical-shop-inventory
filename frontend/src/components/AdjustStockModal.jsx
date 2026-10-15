import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adjustStock } from "../api/products";

export default function AdjustStockModal({ product, onClose }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("add");     // add | remove
  const [quantity, setQuantity] = useState(1);
  const [cost, setCost] = useState(product.latest_cost ?? "");
  const [reason, setReason] = useState("opening");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const mutation = useMutation({
    mutationFn: (payload) => adjustStock(product.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-batches", product.id] });
      onClose();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    const qty = Number(quantity);
    if (!qty || qty <= 0) return setErrorMsg("Quantity must be > 0.");
    if (mode === "add" && (cost === "" || Number(cost) < 0))
      return setErrorMsg("Cost per piece is required for positive adjustment.");

    mutation.mutate({
      quantity_change: mode === "add" ? qty : -qty,
      cost_per_piece: mode === "add" ? Number(cost) : null,
      reason,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-1">Adjust Stock</h3>
        <p className="text-xs text-slate-500 mb-4">
          {product.name} — current stock: {Number(product.current_stock)}
        </p>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("add")}
              className={`px-3 py-1 rounded text-xs border ${
                mode === "add"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              Add stock
            </button>
            <button
              type="button"
              onClick={() => setMode("remove")}
              className={`px-3 py-1 rounded text-xs border ${
                mode === "remove"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              Remove stock
            </button>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Quantity *
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full border rounded px-2 py-1 text-right"
            />
          </label>

          {mode === "add" && (
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Cost per piece ₹ *
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
                className="w-full border rounded px-2 py-1 text-right"
              />
              <span className="text-xs text-slate-500">
                Used for FIFO cost tracking. Fill with the purchase price.
              </span>
            </label>
          )}

          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Reason
            </span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded px-2 py-1"
            >
              <option value="opening">Opening stock</option>
              <option value="correction">Correction</option>
              <option value="damage">Damage / loss</option>
              <option value="other">Other</option>
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
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}