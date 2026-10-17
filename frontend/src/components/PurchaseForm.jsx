import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { listWholesalers } from "../api/wholesalers";
import { listProducts } from "../api/products";
import { createPurchase } from "../api/purchases";

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
import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import LoadPurchaseListDialog from "./LoadPurchaseListDialog";
import { markReceived } from "../api/purchaseList";

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
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadedItemIds, setLoadedItemIds] = useState([]);

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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["wholesaler-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-list"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-list-budget"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-list-recommendations"],
      });

      if (loadedItemIds.length > 0) {
        try {
          await markReceived(loadedItemIds);
        } catch (err) {
          // Non-fatal; purchase was saved, only the list cleanup failed
          console.error(err);
        }
      }

      toast.success("Purchase saved");
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
      if (!line.category) return setErrorMsg(`Line ${i + 1}: pick a category.`);
      if (!line.product_id)
        return setErrorMsg(`Line ${i + 1}: pick a product.`);
      if (Number(line.quantity_bought) <= 0)
        return setErrorMsg(`Line ${i + 1}: quantity must be > 0.`);
      if (line.unit_price === "" || Number(line.unit_price) < 0)
        return setErrorMsg(`Line ${i + 1}: enter a valid unit price.`);
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

  function handleLoadFromList(chosenItems) {
    const newLines = chosenItems.map((it) => {
      const product = productMap[it.product_id];
      return {
        category: product?.category || "",
        product_id: it.product_id,
        quantity_bought: Number(it.quantity) || 1,
        unit_used: "piece",
        unit_price: it.last_price != null ? Number(it.last_price) : "",
      };
    });

    // Replace empty lines, or append
    setItems((prev) => {
      const nonEmpty = prev.filter((l) => l.product_id);
      return [...nonEmpty, ...newLines];
    });

    setLoadedItemIds(chosenItems.map((it) => it.id));
    setShowLoadDialog(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-275! w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between -mt-2">
          <span className="text-xs text-muted-foreground">
            {loadedItemIds.length > 0
              ? `${loadedItemIds.length} item${
                  loadedItemIds.length !== 1 ? "s" : ""
                } loaded from your Purchase List`
              : ""}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowLoadDialog(true)}
            disabled={!wholesalerId}
            title={
              !wholesalerId
                ? "Pick a wholesaler first"
                : "Load items from your list"
            }
          >
            <ClipboardList className="size-4" />
            Load from Purchase List
          </Button>
        </div>

        {showLoadDialog && (
          <LoadPurchaseListDialog
            wholesalerId={wholesalerId ? Number(wholesalerId) : null}
            onClose={() => setShowLoadDialog(false)}
            onLoad={handleLoadFromList}
          />
        )}

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Wholesaler *</Label>
              <Select value={wholesalerId} onValueChange={setWholesalerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wholesaler" />
                </SelectTrigger>
                <SelectContent>
                  {wholesalers.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Receipt #</Label>
              <Input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                <Plus className="size-3.5" />
                Add line
              </Button>
            </div>

            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-35">Category</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-28 text-right">Price /pc</TableHead>
                    <TableHead className="w-28 text-right">Line ₹</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                      <TableRow key={i}>
                        <TableCell className="p-1">
                          <Select
                            value={line.category}
                            onValueChange={(v) =>
                              updateLine(i, {
                                category: v,
                                product_id: "",
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryList.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Select
                            value={
                              line.product_id ? String(line.product_id) : ""
                            }
                            onValueChange={(v) =>
                              updateLine(i, {
                                product_id: v ? Number(v) : "",
                              })
                            }
                            disabled={!line.category}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue
                                placeholder={
                                  line.category
                                    ? "Select product"
                                    : "Pick category first"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {productsInCategory(line.category).map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name}
                                  {p.brand ? ` (${p.brand})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity_bought}
                            onChange={(e) =>
                              updateLine(i, { quantity_bought: e.target.value })
                            }
                            className="h-8 text-right text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Select
                            value={line.unit_used}
                            onValueChange={(v) =>
                              updateLine(i, { unit_used: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="piece">piece</SelectItem>
                              <SelectItem value="box">box</SelectItem>
                              <SelectItem value="meter">meter</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) =>
                              updateLine(i, { unit_price: e.target.value })
                            }
                            className="h-8 text-right text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1 text-right text-sm font-medium">
                          ₹ {lineTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-1 text-center">
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => removeLine(i)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="border-t bg-muted/30 px-4 py-2 flex justify-end gap-4 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">₹ {total.toFixed(2)}</span>
              </div>
            </Card>
          </div>

          {/* Payment */}
          <Card className="p-3">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Amount paid ₹</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-right"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cash ₹</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashPaid}
                  onChange={(e) => setCashPaid(e.target.value)}
                  disabled={paymentMode !== "mixed" && paymentMode !== "cash"}
                  className="text-right disabled:bg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">UPI ₹</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={upiPaid}
                  onChange={(e) => setUpiPaid(e.target.value)}
                  disabled={paymentMode !== "mixed" && paymentMode !== "upi"}
                  className="text-right disabled:bg-muted"
                />
              </div>
            </div>
          </Card>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
