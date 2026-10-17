import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { getPurchase } from "../api/purchases";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import TableSkeleton from "@/components/common/TableSkeleton";

export default function PurchaseDetailModal({ purchaseId, onClose }) {
  const { data: purchase, isLoading, error } = useQuery({
    queryKey: ["purchase", purchaseId],
    queryFn: () => getPurchase(purchaseId),
    enabled: !!purchaseId,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <TableSkeleton rows={3} cols={4} />
        ) : error ? (
          <div className="text-destructive text-sm">Failed to load purchase.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Date" value={purchase.purchase_date} />
              <Info
                label="Wholesaler"
                value={purchase.wholesaler_name || `#${purchase.wholesaler_id}`}
              />
              <Info label="Receipt #" value={purchase.receipt_number || "—"} />
              <Info
                label="Total"
                value={`₹ ${Number(purchase.total_amount).toFixed(2)}`}
              />
              <Info
                label="Paid"
                value={`₹ ${Number(purchase.amount_paid).toFixed(2)}`}
              />
              <Info label="Mode" value={purchase.payment_mode} />
              <Info
                label="Cash / UPI"
                value={`₹ ${Number(purchase.cash_paid).toFixed(2)} / ₹ ${Number(
                  purchase.upi_paid
                ).toFixed(2)}`}
              />
              <Info
                label="Due on this bill"
                value={
                  <span
                    className={
                      Number(purchase.amount_paid) <
                      Number(purchase.total_amount)
                        ? "text-red-600 font-semibold"
                        : "text-emerald-600 font-semibold"
                    }
                  >
                    ₹{" "}
                    {(
                      Number(purchase.total_amount) -
                      Number(purchase.amount_paid)
                    ).toFixed(2)}
                  </span>
                }
              />
            </div>

            {purchase.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes: </span>
                <span>{purchase.notes}</span>
              </div>
            )}

            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead className="text-right">Price /pc</TableHead>
                    <TableHead className="text-right">Line ₹</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!purchase.items || purchase.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-4"
                      >
                        No items recorded on this bill.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchase.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">
                          {it.product_name || `Product #${it.product_id}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(it.quantity_bought)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{it.unit_used}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {Number(it.quantity_in_pieces)}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹ {Number(it.unit_price).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹ {Number(it.line_total).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}