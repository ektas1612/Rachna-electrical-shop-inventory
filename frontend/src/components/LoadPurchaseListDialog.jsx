import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

import { listPurchaseList } from "../api/purchaseList";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/common/EmptyState";
import TableSkeleton from "@/components/common/TableSkeleton";

export default function LoadPurchaseListDialog({
  wholesalerId,
  onClose,
  onLoad,
}) {
  const [selected, setSelected] = useState(() => new Set());

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["purchase-list", { status: "planned" }],
    queryFn: () => listPurchaseList({ status: "planned" }),
  });

  // Filter: show items that belong to the chosen wholesaler,
  // plus unassigned items.
  const relevant = items.filter((it) => {
    if (!wholesalerId) return true;
    return (
      it.wholesaler_id === Number(wholesalerId) || it.wholesaler_id == null
    );
  });

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === relevant.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(relevant.map((i) => i.id)));
    }
  }

  const allSelected =
    relevant.length > 0 && selected.size === relevant.length;

  function handleLoad() {
    const chosen = relevant.filter((it) => selected.has(it.id));
    if (chosen.length === 0) return;
    onLoad(chosen);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl! max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load items from Purchase List</DialogTitle>
        </DialogHeader>

        <p className="-mt-2 text-xs text-muted-foreground">
          {wholesalerId
            ? "Showing items for the selected wholesaler, plus unassigned ones."
            : "No wholesaler chosen on the form — showing all items."}
        </p>

        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : relevant.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nothing to load"
            description="Your Purchase List has no items matching this wholesaler."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right w-24">Qty</TableHead>
                  <TableHead className="text-right w-32">Last price ₹</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relevant.map((it) => (
                  <TableRow
                    key={it.id}
                    className="cursor-pointer"
                    onClick={() => toggle(it.id)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(it.id)}
                        onChange={() => toggle(it.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {it.product_name}
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
                    <TableCell className="text-right">
                      {Number(it.quantity)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {it.last_price != null
                        ? `₹ ${Number(it.last_price).toFixed(2)}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <div className="text-xs text-muted-foreground">
          {selected.size} of {relevant.length} selected
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleLoad} disabled={selected.size === 0}>
            Load {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}