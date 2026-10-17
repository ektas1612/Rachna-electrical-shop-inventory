import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { listProducts } from "../api/products";
import {
  buildSwitchboard,
  switchboardNameSuggestions,
} from "../api/switchboards";

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
      toast.success("Switchboard built");
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

    mutation.mutate({
      name: name.trim(),
      listed_price: Number(listedPrice),
      built_date: builtDate,
      code_prefix: codePrefix.trim() || "SB",
      notes: notes.trim() || null,
      components: items.map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
      })),
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-275! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build Switchboard</DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Board name *</Label>
              <Input
                list="board-name-suggestions"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 6-module wooden"
                required
              />
              <datalist id="board-name-suggestions">
                {nameSuggestions.map((s) => (
                  <option key={s.name} value={s.name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label>Listed price ₹ *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={listedPrice}
                onChange={(e) => setListedPrice(e.target.value)}
                required
                className="text-right"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Built date</Label>
              <Input
                type="date"
                value={builtDate}
                onChange={(e) => setBuiltDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Code prefix</Label>
              <Input
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value)}
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Components used</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                <Plus className="size-3.5" />
                Add component
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
                    <TableHead className="w-28 text-right">Est. cost</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((line, i) => {
                    const p = productMap[line.product_id];
                    const qty = Number(line.quantity) || 0;
                    const cost = p ? Number(p.latest_cost) || 0 : 0;
                    const lineCost = qty * cost;
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
                        <TableCell className="p-1 text-right text-xs text-muted-foreground">
                          ₹ {lineCost.toFixed(2)}
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
                <span className="text-muted-foreground">
                  Estimated material cost
                </span>
                <span className="font-semibold">₹ {estimatedCost.toFixed(2)}</span>
              </div>
            </Card>

            <p className="text-xs text-muted-foreground mt-1">
              Est. cost uses the latest FIFO cost per product. Actual cost
              recorded on save uses FIFO consumption and may differ slightly.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Building…" : "Build Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}