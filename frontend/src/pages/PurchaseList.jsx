import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Lightbulb,
  Package,
  ShoppingCart,
  Check,
  X,
  Copy,
  Download,
} from "lucide-react";
import { toast } from "sonner";

import {
  listPurchaseList,
  addPurchaseListItem,
  updatePurchaseListItem,
  deletePurchaseListItem,
  getRecommendations,
  getPurchaseListBudget,
} from "../api/purchaseList";
import { listProducts } from "../api/products";
import { listWholesalers } from "../api/wholesalers";

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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import TableSkeleton from "@/components/common/TableSkeleton";

import {
  copyListToClipboard,
  listToCsv,
  downloadCsv,
  slugify,
} from "../utils/purchaseListExport";

function money(v) {
  return `₹ ${Number(v ?? 0).toFixed(2)}`;
}

export default function PurchaseList() {
  const queryClient = useQueryClient();
  const [view, setView] = useState("flat"); // flat | wholesaler | category
  const [showAdd, setShowAdd] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["purchase-list", { status: "planned" }],
    queryFn: () => listPurchaseList({ status: "planned" }),
  });

  const { data: budget } = useQuery({
    queryKey: ["purchase-list-budget"],
    queryFn: getPurchaseListBudget,
  });

  const { data: recs = [] } = useQuery({
    queryKey: ["purchase-list-recommendations"],
    queryFn: getRecommendations,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["purchase-list"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-list-budget"] });
    queryClient.invalidateQueries({
      queryKey: ["purchase-list-recommendations"],
    });
  };

  // ---------- Mutations ----------

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => updatePurchaseListItem(id, patch),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseListItem,
    onSuccess: () => {
      invalidate();
      toast.success("Removed from list");
    },
    onError: (e) => toast.error(e.message),
  });

  // ---------- Grouping ----------

  const grouped = useMemo(() => {
    if (view === "flat") return [{ key: "all", label: null, items }];

    const groups = {};
    for (const it of items) {
      let key;
      let label;
      if (view === "wholesaler") {
        key = it.wholesaler_id ?? "__none__";
        label = it.wholesaler_name || "Unassigned";
      } else {
        key = it.product_category || "__none__";
        label = it.product_category || "Uncategorized";
      }
      if (!groups[key]) groups[key] = { key, label, items: [] };
      groups[key].items.push(it);
    }
    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
  }, [items, view]);

  return (
    <div>
      <PageHeader
        title="Purchase List"
        subtitle="Plan what to order from your wholesalers"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (items.length === 0) return;
                const ok = await copyListToClipboard(items);
                if (ok) toast.success("Copied to clipboard");
                else toast.error("Couldn't copy — try again");
              }}
              disabled={items.length === 0}
            >
              <Copy className="size-4" />
              Copy list
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (items.length === 0) return;
                const csv = listToCsv(items);
                const stamp = new Date().toISOString().slice(0, 10);
                downloadCsv(`purchase-order-${stamp}.csv`, csv);
              }}
              disabled={items.length === 0}
            >
              <Download className="size-4" />
              CSV
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="size-4" />
              Add Item
            </Button>
          </div>
        }
      />

      {/* Budget summary */}
      {budget && budget.item_count > 0 && (
        <Card className="p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Planned budget
              </div>
              <div className="text-2xl font-semibold">
                {money(budget.total)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {budget.item_count} item{budget.item_count !== 1 ? "s" : ""}
              </div>
            </div>
            {budget.by_wholesaler.length > 0 && (
              <div className="flex flex-wrap gap-4 text-sm">
                {budget.by_wholesaler.map((b) => (
                  <div key={b.wholesaler_id ?? "none"}>
                    <div className="text-xs text-muted-foreground">
                      {b.wholesaler_name}
                    </div>
                    <div className="font-medium">{money(b.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* View tabs */}
      <Tabs value={view} onValueChange={setView} className="mb-4">
        <TabsList>
          <TabsTrigger value="flat">Flat list</TabsTrigger>
          <TabsTrigger value="wholesaler">By wholesaler</TabsTrigger>
          <TabsTrigger value="category">By category</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {isLoading ? (
        <Card className="p-4">
          <TableSkeleton rows={4} cols={5} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="Nothing on your list yet"
            description="Add items below, or pick from the low-stock recommendations."
            action={
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="size-4" />
                Add Item
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.key} className="overflow-hidden p-0">
              {group.label && (
                <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                  <span className="text-sm font-medium">{group.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">
                      {group.items.length} item
                      {group.items.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Copy this group"
                      onClick={async () => {
                        const ok = await copyListToClipboard(group.items);
                        if (ok) toast.success(`Copied ${group.label} order`);
                        else toast.error("Couldn't copy — try again");
                      }}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Download this group as CSV"
                      onClick={() => {
                        const csv = listToCsv(group.items);
                        const stamp = new Date().toISOString().slice(0, 10);
                        downloadCsv(
                          `purchase-order-${slugify(group.label)}-${stamp}.csv`,
                          csv
                        );
                      }}
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%]">Product</TableHead>
                    <TableHead className="w-[12%]">Category</TableHead>
                    <TableHead className="w-[10%]">Qty</TableHead>
                    <TableHead className="w-[12%] text-right">
                      Last price ₹
                    </TableHead>
                    <TableHead className="w-[12%] text-right">
                      Est. cost ₹
                    </TableHead>
                    <TableHead className="w-[16%]">Wholesaler</TableHead>
                    <TableHead className="w-[10%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">
                        <div className="truncate" title={it.product_name}>
                          {it.product_name}
                        </div>
                        {it.notes && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {it.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {it.product_category ? (
                          <Badge variant="secondary">
                            {it.product_category}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          defaultValue={Number(it.quantity)}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0 && val !== Number(it.quantity)) {
                              updateMutation.mutate({
                                id: it.id,
                                patch: { quantity: val },
                              });
                            }
                          }}
                          className="h-8 text-right text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {it.last_price != null ? money(it.last_price) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {it.last_price != null
                          ? money(Number(it.quantity) * Number(it.last_price))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {it.wholesaler_name || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (
                              confirm(
                                `Remove "${it.product_name}" from the list?`
                              )
                            ) {
                              deleteMutation.mutate(it.id);
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <Card className="mt-6 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="size-4 text-amber-500" />
            <h3 className="text-sm font-semibold">
              Low stock — considered adding
            </h3>
            <span className="text-xs text-muted-foreground">
              ({recs.length} item{recs.length !== 1 ? "s" : ""})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {recs.map((r) => (
              <div
                key={r.product_id}
                className="flex items-center justify-between gap-2 border rounded-md px-3 py-2 bg-background"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {r.product_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stock {Number(r.current_stock)} / low{" "}
                    {Number(r.low_threshold)}
                    {" — "}
                    suggest {Number(r.suggested_qty)}
                    {r.last_price != null && ` @ ${money(r.last_price)}`}
                  </div>
                </div>
                {r.already_on_list ? (
                  <Badge variant="secondary" className="shrink-0">
                    On list
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      addPurchaseListItem({
                        product_id: r.product_id,
                        quantity: Number(r.suggested_qty),
                        wholesaler_id: null,
                        notes: null,
                      }).then(() => {
                        invalidate();
                        toast.success("Added to list");
                      });
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add dialog */}
      {showAdd && (
        <AddItemDialog
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            invalidate();
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function AddItemDialog({ onClose, onSaved }) {
  const [productId, setProductId] = useState("");
  const [wholesalerId, setWholesalerId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts({}),
  });

  const { data: wholesalers = [] } = useQuery({
    queryKey: ["wholesalers"],
    queryFn: () => listWholesalers({}),
  });

  const mutation = useMutation({
    mutationFn: addPurchaseListItem,
    onSuccess: () => {
      toast.success("Added to list");
      onSaved();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!productId) return setErrorMsg("Pick a product.");
    if (Number(quantity) <= 0) return setErrorMsg("Quantity must be > 0.");

    mutation.mutate({
      product_id: Number(productId),
      quantity: Number(quantity),
      wholesaler_id: wholesalerId ? Number(wholesalerId) : null,
      notes: notes.trim() || null,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Purchase List</DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.brand ? ` (${p.brand})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="text-right"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Wholesaler (optional)</Label>
              <Select value={wholesalerId} onValueChange={setWholesalerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {wholesalers.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Add to List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
