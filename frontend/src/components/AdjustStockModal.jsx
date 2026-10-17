import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, PackageMinus } from "lucide-react";
import { toast } from "sonner";

import { adjustStock } from "../api/products";

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

export default function AdjustStockModal({ product, onClose }) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState("add");
  const [quantity, setQuantity] = useState(1);
  const [cost, setCost] = useState(product.latest_cost ?? "");
  const [reason, setReason] = useState("opening");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const mutation = useMutation({
    mutationFn: (payload) => adjustStock(product.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({
        queryKey: ["product-batches", product.id],
      });
      toast.success(mode === "add" ? "Stock added" : "Stock removed");
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
      return setErrorMsg("Cost per piece is required when adding stock.");

    mutation.mutate({
      quantity_change: mode === "add" ? qty : -qty,
      cost_per_piece: mode === "add" ? Number(cost) : null,
      reason,
      notes: notes.trim() || null,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>

        <div className="-mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{product.name}</span>
          {" — "}current stock:{" "}
          <span className="font-medium text-foreground">
            {Number(product.current_stock)}
          </span>
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "add" ? "default" : "outline"}
              onClick={() => setMode("add")}
              className="justify-center"
            >
              <PackagePlus className="size-4" />
              Add stock
            </Button>
            <Button
              type="button"
              variant={mode === "remove" ? "destructive" : "outline"}
              onClick={() => setMode("remove")}
              className="justify-center"
            >
              <PackageMinus className="size-4" />
              Remove stock
            </Button>
          </div>

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

          {mode === "add" && (
            <div className="space-y-1.5">
              <Label>Cost per piece ₹ *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
                className="text-right"
              />
              <p className="text-xs text-muted-foreground">
                Used for FIFO cost tracking. Enter the purchase price.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opening">Opening stock</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
                <SelectItem value="damage">Damage / loss</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
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
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}