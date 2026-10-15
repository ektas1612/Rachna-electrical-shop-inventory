import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listWholesalers,
  createWholesaler,
  updateWholesaler,
  deactivateWholesaler,
} from "../api/wholesalers";

const emptyForm = { name: "", phone: "", notes: "" };

export default function Wholesalers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: wholesalers = [], isLoading } = useQuery({
    queryKey: ["wholesalers", { search }],
    queryFn: () => listWholesalers({ search }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["wholesalers"] });

  const createMutation = useMutation({
    mutationFn: createWholesaler,
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (e) => setErrorMsg(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateWholesaler(id, payload),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (e) => setErrorMsg(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateWholesaler,
    onSuccess: invalidate,
    onError: (e) => setErrorMsg(e.message),
  });

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrorMsg("");
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setErrorMsg("");
  }

  function openEdit(w) {
    setForm({ name: w.name, phone: w.phone || "", notes: w.notes || "" });
    setEditingId(w.id);
    setShowForm(true);
    setErrorMsg("");
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  function handleDelete(w) {
    if (confirm(`Deactivate "${w.name}"?`)) deleteMutation.mutate(w.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Wholesalers</h2>
        <button
          onClick={openAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Add Wholesaler
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm px-3 py-2 border border-slate-300 rounded text-sm"
      />

      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : wholesalers.length === 0 ? (
        <div className="text-slate-500">
          No wholesalers yet. Click "Add Wholesaler".
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Phone</th>
                <th className="text-left px-4 py-2">Notes</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wholesalers.map((w) => (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{w.name}</td>
                  <td className="px-4 py-2 text-slate-600">{w.phone || "—"}</td>
                  <td className="px-4 py-2 text-slate-600 truncate max-w-xs">
                    {w.notes || "—"}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => openEdit(w)}
                      className="text-emerald-600 hover:underline text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(w)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? "Edit Wholesaler" : "Add Wholesaler"}
            </h3>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Name *
                </span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-2 py-1"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Phone
                </span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Notes
                </span>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border rounded px-2 py-1"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded border text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving…"
                    : editingId
                    ? "Save changes"
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}