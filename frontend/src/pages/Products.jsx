import { Fragment, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import {
  listProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  listCategories,
  getProductBatches,
} from "../api/products";
import AdjustStockModal from "../components/AdjustStockModal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import TableSkeleton from "@/components/common/TableSkeleton";

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

export default function Products() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMsg, setErrorMsg] = useState("");
  const [addingNewCategory, setAddingNewCategory] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sortBy, setSortBy] = useState("");
  const [stockStatus, setStockStatus] = useState(""); // "", "low", "out", "in"

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", { search, sortBy }],
    queryFn: () => listProducts({ search, sortBy }),
  });

  const { data: usedCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const allCategories = useMemo(() => {
    const fromProducts = products.map((p) => p.category).filter(Boolean);
    const combined = new Set([
      ...DEFAULT_CATEGORIES,
      ...usedCategories,
      ...fromProducts,
    ]);
    return Array.from(combined).sort();
  }, [products, usedCategories]);

  const allBrands = useMemo(() => {
    const s = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(s).sort();
  }, [products]);

  const allSuppliers = useMemo(() => {
    const s = new Set(products.map((p) => p.supplier_name).filter(Boolean));
    return Array.from(s).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterCategory && p.category !== filterCategory) return false;
      if (filterBrand && p.brand !== filterBrand) return false;
      if (filterSupplier && p.supplier_name !== filterSupplier) return false;

      if (stockStatus) {
        const stock = Number(p.current_stock);
        const low = Number(p.low_stock_threshold);
        const mid = Number(p.mid_stock_threshold);
        if (stockStatus === "out" && stock > 0) return false;
        if (stockStatus === "low" && !(stock > 0 && stock <= low)) return false;
        if (stockStatus === "in" && !(stock > mid)) return false;
      }
      return true;
    });
  }, [products, filterCategory, filterBrand, filterSupplier, stockStatus]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      invalidate();
      toast.success("Product created");
      closeForm();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateProduct(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Product updated");
      closeForm();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateProduct,
    onSuccess: () => {
      invalidate();
      toast.success("Product deactivated");
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
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
      name: form.name.trim(),
      category: form.category.trim(),
      brand: form.brand?.trim() || null,
      pieces_per_box: Number(form.pieces_per_box) || 1,
      selling_price: Number(form.selling_price),
      low_stock_threshold: Number(form.low_stock_threshold),
      mid_stock_threshold: Number(form.mid_stock_threshold),
    };

    if (!payload.category) {
      setErrorMsg("Please select or type a category.");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const hasFilters = filterCategory || filterBrand || filterSupplier || sortBy || stockStatus;

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your catalog, stock, and pricing"
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add Product
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-3 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {allCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All brands</SelectItem>
              {allBrands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All suppliers</SelectItem>
              {allSuppliers.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort: name A–Z" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Name A–Z</SelectItem>
              <SelectItem value="name_desc">Name Z–A</SelectItem>
              <SelectItem value="stock_asc">Stock: lowest first</SelectItem>
              <SelectItem value="stock_desc">Stock: highest first</SelectItem>
              <SelectItem value="price_asc">Price: lowest first</SelectItem>
              <SelectItem value="price_desc">Price: highest first</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stockStatus} onValueChange={setStockStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Stock: all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
              <SelectItem value="low">Low stock 🔴</SelectItem>
              <SelectItem value="in">In stock 🟢</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCategory("");
                setFilterBrand("");
                setFilterSupplier("");
                setSortBy("");
                setStockStatus("");
              }}
            >
              Clear filters
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filteredProducts.length} of {products.length} products
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={
              products.length === 0
                ? "No products yet"
                : "No products match the filters"
            }
            description={
              products.length === 0
                ? "Click “Add Product” to create your first one."
                : "Try clearing or adjusting the filters above."
            }
            action={
              products.length === 0 && (
                <Button onClick={openAdd}>
                  <Plus className="size-4" />
                  Add Product
                </Button>
              )
            }
          />
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-[28%]">Name</TableHead>
                <TableHead className="w-[12%]">Category</TableHead>
                <TableHead className="w-[10%]">Brand</TableHead>
                <TableHead className="w-[14%]">Supplier</TableHead>
                <TableHead className="w-[9%] text-right">Cost ₹</TableHead>
                <TableHead className="w-[9%] text-right">Price ₹</TableHead>
                <TableHead className="w-[8%] text-right">Stock</TableHead>
                <TableHead className="w-[10%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <Fragment key={p.id}>
                  <TableRow>
                    <TableCell className="w-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() =>
                          setExpandedId(expandedId === p.id ? null : p.id)
                        }
                      >
                        {expandedId === p.id ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium truncate">
                      {p.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="truncate max-w-full"
                      >
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">
                      {p.brand || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">
                      {p.supplier_name || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.latest_cost != null ? (
                        `₹ ${Number(p.latest_cost).toFixed(2)}`
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">
                          no cost
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹ {Number(p.selling_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StockBadge
                        stock={Number(p.current_stock)}
                        low={Number(p.low_stock_threshold)}
                        mid={Number(p.mid_stock_threshold)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setAdjustProduct(p)}
                          title="Adjust stock"
                        >
                          <SlidersHorizontal className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(p)}
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === p.id && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={9} className="p-0">
                        <BatchesPanel productId={p.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Name *">
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="Category *">
              {!addingNewCategory ? (
                <Select
                  value={form.category}
                  onValueChange={(v) => {
                    if (v === "__new__") {
                      setAddingNewCategory(true);
                      setForm((f) => ({ ...f, category: "" }));
                    } else {
                      setForm((f) => ({ ...f, category: v }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Add new…</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="New category name"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddingNewCategory(false);
                      setForm((f) => ({ ...f, category: "" }));
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </Field>

            <Field label="Brand">
              <Input name="brand" value={form.brand} onChange={handleChange} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit">
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">piece</SelectItem>
                    <SelectItem value="meter">meter</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Pieces per box">
                <Input
                  type="number"
                  name="pieces_per_box"
                  value={form.pieces_per_box}
                  onChange={handleChange}
                  min={1}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Selling price ₹ *">
                <Input
                  type="number"
                  name="selling_price"
                  value={form.selling_price}
                  onChange={handleChange}
                  required
                  min={0}
                  step="0.01"
                />
              </Field>
              <Field label="Low stock 🔴">
                <Input
                  type="number"
                  name="low_stock_threshold"
                  value={form.low_stock_threshold}
                  onChange={handleChange}
                  min={0}
                />
              </Field>
              <Field label="Mid stock 🟠">
                <Input
                  type="number"
                  name="mid_stock_threshold"
                  value={form.mid_stock_threshold}
                  onChange={handleChange}
                  min={0}
                />
              </Field>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving…"
                  : editingId
                  ? "Save changes"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust stock modal */}
      {adjustProduct && (
        <AdjustStockModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this product?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” will be hidden from listings. Existing
              sales and stock records are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StockBadge({ stock, low, mid }) {
  let tone = "text-emerald-600";
  let dot = "bg-emerald-500";
  if (stock <= low) {
    tone = "text-red-600";
    dot = "bg-red-500";
  } else if (stock <= mid) {
    tone = "text-amber-600";
    dot = "bg-amber-500";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${tone}`}
    >
      <span className={`inline-block size-2 rounded-full ${dot}`} />
      {stock}
    </span>
  );
}

function BatchesPanel({ productId }) {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["product-batches", productId],
    queryFn: () => getProductBatches(productId),
  });

  if (isLoading) {
    return (
      <div className="p-3 text-xs text-muted-foreground">Loading batches…</div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No stock batches yet — add stock via “Adjust”.
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Remaining batches — oldest first
      </div>
      <div className="grid gap-1">
        {batches.map((b) => (
          <div
            key={b.id}
            className="grid grid-cols-6 gap-3 text-xs items-center bg-background rounded px-2 py-1.5 border"
          >
            <span className="text-muted-foreground">{b.purchase_date}</span>
            <span>{b.wholesaler_name || "—"}</span>
            <span className="text-muted-foreground">
              {b.receipt_number || "—"}
            </span>
            <span className="text-right text-muted-foreground">
              initial {Number(b.quantity_initial)}
            </span>
            <span className="text-right font-medium">
              remaining {Number(b.quantity_remaining)}
            </span>
            <span className="text-right">
              @ ₹ {Number(b.cost_per_piece).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
