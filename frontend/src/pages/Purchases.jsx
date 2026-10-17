import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Calendar, X } from "lucide-react";

import { listPurchases } from "../api/purchases";
import { listWholesalers } from "../api/wholesalers";
import PurchaseForm from "../components/PurchaseForm";
import PurchaseDetailModal from "../components/PurchaseDetailModal";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import TableSkeleton from "@/components/common/TableSkeleton";
import { useSearchParams } from "react-router-dom";

export default function Purchases() {
  const [showForm, setShowForm] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [wholesalerFilter, setWholesalerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: wholesalers = [] } = useQuery({
    queryKey: ["wholesalers"],
    queryFn: () => listWholesalers({}),
  });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", { wholesalerFilter, dateFrom, dateTo }],
    queryFn: () =>
      listPurchases({
        wholesalerId: wholesalerFilter ? Number(wholesalerFilter) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const hasFilters = wholesalerFilter || dateFrom || dateTo;
  const totalAmount = purchases.reduce((s, p) => s + Number(p.total_amount), 0);

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle="Bills from your wholesalers"
        actions={
          <Button
            onClick={() => setShowForm(true)}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md h-11 px-5 text-base font-semibold"
          >
            <Plus className="size-5" />
            New Purchase
          </Button>
        }
      />

      <Card className="p-3 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Wholesaler</Label>
            <Select
              value={wholesalerFilter}
              onValueChange={setWholesalerFilter}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All wholesalers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All wholesalers</SelectItem>
                {wholesalers.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setWholesalerFilter("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}

          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Filtered total
            </div>
            <div className="text-lg font-semibold">
              ₹ {totalAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              hasFilters ? "No purchases in this range" : "No purchases yet"
            }
            description={
              hasFilters
                ? "Try widening the date range or removing the wholesaler filter."
                : "Click “New Purchase” to record your first bill."
            }
            action={
              !hasFilters && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="size-4" />
                  New Purchase
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Wholesaler</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
                <TableHead className="text-right">Paid ₹</TableHead>
                <TableHead className="text-right w-25">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => {
                const total = Number(p.total_amount);
                const paid = Number(p.amount_paid);
                const due = total - paid;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">
                      {p.purchase_date}
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.wholesaler_name || `#${p.wholesaler_id}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {p.receipt_number || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.items?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹ {total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {due > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                          ₹ {paid.toFixed(2)} / ₹ {total.toFixed(2)}
                        </Badge>
                      ) : (
                        <span className="text-emerald-600 text-sm">
                          ₹ {paid.toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewId(p.id)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {showForm && <PurchaseForm onClose={() => setShowForm(false)} />}
      {reviewId && (
        <PurchaseDetailModal
          purchaseId={reviewId}
          onClose={() => setReviewId(null)}
        />
      )}
    </div>
  );
}
