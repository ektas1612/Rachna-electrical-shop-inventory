import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { listProducts } from "../api/products";
import { createSale } from "../api/sales";
import { listCustomers, createCustomer } from "../api/customers";

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
import { Badge } from "@/components/ui/badge";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyLine = { category: "", product_id: "", quantity: 1, actual_price: "" };

export default function SaleForm({ onClose }) {
  const queryClient = useQueryClient();

  const [saleDate, setSaleDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [errorMsg, setErrorMsg] = useState("");

  const [paidInFull, setPaidInFull] = useState(true);
  const [payMethod, setPayMethod] = useState("cash");
  const [cashInput, setCashInput] = useState(0);
  const [upiInput, setUpiInput] = useState(0);

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

  // Derive cash/upi
  let derivedCash = 0;
  let derivedUpi = 0;
  if (paidInFull) {
    if (payMethod === "cash") derivedCash = totalActual;
    else if (payMethod === "upi") derivedUpi = totalActual;
    else {
      derivedCash = Number(cashInput) || 0;
      derivedUpi = Number(upiInput) || 0;
    }
  } else {
    derivedCash = Number(cashInput) || 0;
    derivedUpi = Number(upiInput) || 0;
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
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Sale recorded");
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
      if (!line.product_id) return setErrorMsg(`Line ${i + 1}: pick a product.`);
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
    }

    if (paidInFull) {
      if (payMethod === "mixed" && totalPaid !== totalActual) {
        return setErrorMsg(
          `Mixed payment must add up to the total (₹${totalActual.toFixed(
            2
          )}). Currently ₹${totalPaid.toFixed(2)}.`
        );
      }
    } else if (totalPaid > totalActual) {
      return setErrorMsg(
        `Paid (₹${totalPaid.toFixed(2)}) exceeds total (₹${totalActual.toFixed(
          2
        )}).`
      );
    }

    // Customer required for partial/unpaid
    if ((!paidInFull || totalPaid < totalActual) && !customerId) {
      return setErrorMsg(
        "A customer is required when payment is partial or unpaid."
      );
    }

    mutation.mutate({
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
    });
  }

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerId(String(newCustomer.id));
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

  const needsCustomer = !paidInFull || totalPaid < totalActual;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-275! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Sale</DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Items */}
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
                    <TableHead className="w-32.5">Category</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-20 text-right">Listed ₹</TableHead>
                    <TableHead className="w-24 text-right">Sold @ ₹</TableHead>
                    <TableHead className="w-24 text-right">Line ₹</TableHead>
                    <TableHead className="w-16 text-right">Stock</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((line, i) => {
                    const p = productMap[line.product_id];
                    const qty = Number(line.quantity) || 0;
                    const actual = Number(line.actual_price) || 0;
                    const lineTotal = qty * actual;
                    const listed = p ? Number(p.selling_price) : 0;
                    const overStock = p && qty > Number(p.current_stock);

                    return (
                      <TableRow key={i}>
                        <TableCell className="p-1">
                          <Select
                            value={line.category}
                            onValueChange={(v) =>
                              updateLine(i, {
                                category: v,
                                product_id: "",
                                actual_price: "",
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
                            value={line.product_id ? String(line.product_id) : ""}
                            onValueChange={(v) =>
                              pickProduct(i, v ? Number(v) : "")
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
                        <TableCell className="p-1 text-right text-xs text-muted-foreground">
                          {listed.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.actual_price}
                            onChange={(e) =>
                              updateLine(i, { actual_price: e.target.value })
                            }
                            className="h-8 text-right text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1 text-right text-sm font-medium">
                          ₹ {lineTotal.toFixed(2)}
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

              <div className="border-t bg-muted/30 px-4 py-2 flex justify-end gap-6 text-sm">
                <span className="text-muted-foreground">
                  Subtotal (listed): ₹ {subtotalListed.toFixed(2)}
                </span>
                <span className="font-semibold">₹ {totalActual.toFixed(2)}</span>
              </div>
            </Card>
          </div>

          {/* Payment */}
          <Card className="p-3 bg-muted/30">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <div className="inline-flex rounded-md border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setPaidInFull(true)}
                  className={`px-3 py-1.5 ${
                    paidInFull
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  Paid in full
                </button>
                <button
                  type="button"
                  onClick={() => setPaidInFull(false)}
                  className={`px-3 py-1.5 border-l ${
                    !paidInFull
                      ? "bg-amber-500 text-white"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  Partial / Unpaid
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Method
                </span>
                {["cash", "upi", "mixed"].map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={payMethod === m ? "default" : "outline"}
                    onClick={() => setPayMethod(m)}
                  >
                    {m.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {(payMethod === "mixed" || !paidInFull) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cash ₹</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    className="text-right"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">UPI ₹</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={upiInput}
                    onChange={(e) => setUpiInput(e.target.value)}
                    className="text-right"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between text-sm bg-background rounded px-3 py-2 border">
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

            {needsCustomer && (
              <div className="mt-3 pt-3 border-t space-y-1.5">
                <Label>Customer * (required for partial / unpaid)</Label>

                {!showNewCustomer ? (
                  <div className="flex gap-2">
                    <Select
                      value={customerId}
                      onValueChange={setCustomerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                            {c.phone ? ` (${c.phone})` : ""}
                            {c.outstanding != null && Number(c.outstanding) !== 0
                              ? ` — owes ₹${Number(c.outstanding).toFixed(2)}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewCustomer(true)}
                    >
                      <Plus className="size-3.5" />
                      New
                    </Button>
                  </div>
                ) : (
                  <Card className="p-3 space-y-2">
                    <Input
                      autoFocus
                      placeholder="Customer name *"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                    <Input
                      placeholder="Phone (optional)"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowNewCustomer(false);
                          setNewCustomerName("");
                          setNewCustomerPhone("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateCustomer}
                        disabled={createCustomerMutation.isPending}
                      >
                        {createCustomerMutation.isPending ? "Saving…" : "Add"}
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </Card>

          {amountDue > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠ This sale will be recorded as <b>unpaid / partial</b> for ₹
              {amountDue.toFixed(2)}.
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}