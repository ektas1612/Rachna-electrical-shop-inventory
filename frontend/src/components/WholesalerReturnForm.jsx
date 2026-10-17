import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { listWholesalers } from "../api/wholesalers";
import { listProducts } from "../api/products";
import { createReturn } from "../api/wholesalerReturns";

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isWeekend(isoDate) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const dow = d.getDay();
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
      toast.success("Return saved");
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

    mutation.mutate({
      wholesaler_id: Number(wholesalerId),
      return_date: returnDate,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      items: items.map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
      })),
    });
  }

  const weekdayWarning = returnDate && !isWeekend(returnDate);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-275! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Wholesaler Return</DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
            {errorMsg}
          </div>
        )}

        {weekdayWarning && (
          <div className="bg-amber-50 text-amber-800 text-sm p-2 rounded-md border border-amber-200">
            ⚠ Returns are usually done on weekends. You're entering a{" "}
            {new Date(returnDate).toLocaleDateString("en-IN", {
              weekday: "long",
            })}
            . It's fine to continue.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>Date *</Label>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Reference #</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Returned items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                <Plus className="size-3.5" />
                Add line
              </Button>
            </div>

            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32.5">Category</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-20 text-right">Qty</TableHead>
                    <TableHead className="w-16 text-right">Stock</TableHead>
                    <TableHead className="w-24 text-right">Unit ₹</TableHead>
                    <TableHead className="w-24 text-right">Line ₹</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((line, i) => {
                    const p = productMap[line.product_id];
                    const qty = Number(line.quantity) || 0;
                    const price = Number(line.unit_price) || 0;
                    const lineTotal = qty * price;
                    const overStock = p && qty > Number(p.current_stock);

                    return (
                      <TableRow key={i}>
                        <TableCell className="p-1">
                          <Select
                            value={line.category}
                            onValueChange={(v) =>
                              updateLine(i, { category: v, product_id: "" })
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
                            value={line.product_id ? String(line.product_id) : ""}
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
                              {productsInCategory(line.category).map((prod) => (
                                <SelectItem key={prod.id} value={String(prod.id)}>
                                  {prod.name}
                                  {prod.brand ? ` (${prod.brand})` : ""}
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
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(i, { quantity: e.target.value })
                            }
                            className={`h-8 text-right text-xs ${
                              overStock ? "border-red-500" : ""
                            }`}
                          />
                        </TableCell>
                        <TableCell
                          className={`p-1 text-right text-xs ${
                            overStock
                              ? "text-red-600 font-bold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {p ? Number(p.current_stock) : "—"}
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
                <span className="font-semibold text-red-600">
                  ₹ {total.toFixed(2)}
                </span>
              </div>
            </Card>

            <p className="text-xs text-muted-foreground mt-1">
              Stock will be reduced from the newest batches first. This return
              amount reduces what you owe the wholesaler.
            </p>
          </div>

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
              {mutation.isPending ? "Saving…" : "Save Return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}