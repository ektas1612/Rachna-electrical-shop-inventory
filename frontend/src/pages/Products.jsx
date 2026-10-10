import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  listCategories,
} from "../api/products";

const emptyForm = {
  name: "",
  category: "",
  brand: "",
  unit: "piece",
  pieces_per_box: 1,
  selling_price: "",
  low_stock_threshold: 10,
  mid_stock_threshold: 30,
};

const DEFAULT_CATEGORIES = [
  "Switch",
  "Socket",
  "MCB",
  "Wire",
  "Fan",
  "Light",
  "Bulb",
  "Switch Board",
  "Regulator",
  "Tools",
  "Other",
];

export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMsg, setErrorMsg] = useState("");
  const [addingNewCategory, setAddingNewCategory] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", { search }],
    queryFn: () => listProducts({ search }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateProduct(id, payload),
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateProduct,
    onSuccess: invalidate,
    onError: (e) => setErrorMsg(e.message),
  });

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrorMsg("");
    setAddingNewCategory(false);
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setErrorMsg("");
    setAddingNewCategory(false);
  }

  function openEdit(p) {
    setForm({
      name: p.name,
      category: p.category,
      brand: p.brand || "",
      unit: p.unit,
      pieces_per_box: p.pieces_per_box,
      selling_price: p.selling_price,
      low_stock_threshold: p.low_stock_threshold,
      mid_stock_threshold: p.mid_stock_threshold,
    });
    setEditingId(p.id);
    setShowForm(true);
    setErrorMsg("");
    setAddingNewCategory(false);
  }

  function handleChange(e) {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    const payload = {
      ...form,
      pieces_per_box: Number(form.pieces_per_box) || 1,
      selling_price: Number(form.selling_price),
      low_stock_threshold: Number(form.low_stock_threshold),
      mid_stock_threshold: Number(form.mid_stock_threshold),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }

    if (payload.category === "__new__" || !payload.category) {
      setErrorMsg("Please select or type a category.");
      return;
    }
  }

  function handleDelete(p) {
    if (confirm(`Deactivate "${p.name}"? It won't be shown in listings.`)) {
      deleteMutation.mutate(p.id);
    }
  }

  const { data: usedCategories = [] } = useQuery({
    queryKey: ["categories"],
    quesryFn: listCategories,
  });

  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...usedCategories])
  ).sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Products</h2>
        <button
          onClick={openAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Add Product
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name or brand…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm px-3 py-2 border border-slate-300 rounded text-sm"
      />

      {isLoading ? (
        <div className="text-slate-500">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="text-slate-500">
          No products yet. Click "Add Product".
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Brand</th>
                <th className="text-right px-4 py-2">Price (₹)</th>
                <th className="text-right px-4 py-2">Stock</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-slate-600">{p.category}</td>
                  <td className="px-4 py-2 text-slate-600">{p.brand || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    ₹ {Number(p.selling_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number(p.current_stock)}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-emerald-600 hover:underline text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? "Edit Product" : "Add Product"}
            </h3>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Name *">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-2 py-1"
                />
              </Field>

              <Field label="Category *">
                {!addingNewCategory ? (
                  <select
                    value={form.category}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setAddingNewCategory(true);
                        setForm((f) => ({ ...f, category: "" }));
                      } else {
                        setForm((f) => ({ ...f, category: e.target.value }));
                      }
                    }}
                    required
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="">— Select category —</option>
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__new__">+ Add new…</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      placeholder="Type new category name"
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      className="flex-1 border rounded px-2 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAddingNewCategory(false);
                        setForm((f) => ({ ...f, category: "" }));
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Brand">
                <input
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit">
                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="piece">piece</option>
                    <option value="meter">meter</option>
                    <option value="box">box</option>
                  </select>
                </Field>

                <Field label="Pieces per box">
                  <input
                    type="number"
                    name="pieces_per_box"
                    value={form.pieces_per_box}
                    onChange={handleChange}
                    min={1}
                    className="w-full border rounded px-2 py-1"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Selling price ₹ *">
                  <input
                    type="number"
                    name="selling_price"
                    value={form.selling_price}
                    onChange={handleChange}
                    required
                    min={0}
                    step="0.01"
                    className="w-full border rounded px-2 py-1"
                  />
                </Field>
                <Field label="Low threshold 🔴">
                  <input
                    type="number"
                    name="low_stock_threshold"
                    value={form.low_stock_threshold}
                    onChange={handleChange}
                    min={0}
                    className="w-full border rounded px-2 py-1"
                  />
                </Field>
                <Field label="Mid threshold 🟠">
                  <input
                    type="number"
                    name="mid_stock_threshold"
                    value={form.mid_stock_threshold}
                    onChange={handleChange}
                    min={0}
                    className="w-full border rounded px-2 py-1"
                  />
                </Field>
              </div>

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
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
