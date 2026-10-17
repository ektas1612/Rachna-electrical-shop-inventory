import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Receipt, X } from "lucide-react";

import { listSales } from "../api/sales";
import SaleForm from "../components/SaleForm";

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Sales() {
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", { dateFrom, dateTo, statusFilter }],
    queryFn: () =>
      listSales({
        dateFrom,
        dateTo,
        paymentStatus: statusFilter || undefined,
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

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total_amount), 0);
  const totalCash = sales.reduce((s, x) => s + Number(x.cash_paid), 0);
  const totalUpi = sales.reduce((s, x) => s + Number(x.upi_paid), 0);
  const totalDue = sales.reduce((s, x) => s + Number(x.amount_due), 0);

  const hasFilters = dateFrom || dateTo || statusFilter;

  function setQuickRange(range) {
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    if (range === "today") {
      setDateFrom(iso(today));
      setDateTo(iso(today));
    } else if (range === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setDateFrom(iso(start));
      setDateTo(iso(today));
    } else if (range === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(iso(start));
      setDateTo(iso(today));
    }
  }

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Bills issued to walk-in and credit customers"
        actions={
          <Button
            onClick={() => setShowForm(true)}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md h-11 px-5 text-base font-semibold"
          >
            <Plus className="size-5" />
            New Sale
          </Button>
        }
      />

      <Card className="p-3 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Quick range */}
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setQuickRange("today")}
            >
              Today
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setQuickRange("week")}
            >
              Week
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setQuickRange("month")}
            >
              Month
            </Button>
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

          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setStatusFilter("");
              }}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Summary row */}
        {!isLoading && sales.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <SummaryStat
              label="Revenue"
              value={totalRevenue}
              accent="emerald"
            />
            <SummaryStat label="Cash received" value={totalCash} />
            <SummaryStat label="UPI received" value={totalUpi} />
            <SummaryStat
              label="Due"
              value={totalDue}
              accent={totalDue > 0 ? "red" : "muted"}
            />
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={hasFilters ? "No sales in this range" : "No sales yet"}
            description={
              hasFilters
                ? "Try Today / Week / Month or widen the date range."
                : "Click “New Sale” to record your first sale."
            }
            action={
              !hasFilters && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="size-4" />
                  New Sale
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
                <TableHead className="text-right">Paid ₹</TableHead>
                <TableHead className="text-right">Due ₹</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const due = Number(s.amount_due);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">
                      {s.sale_date}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {s.items?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹ {Number(s.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ₹ {Number(s.amount_paid).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {due > 0 ? (
                        <span className="text-red-600 font-medium">
                          ₹ {due.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.payment_mode}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.payment_status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {showForm && <SaleForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function SummaryStat({ label, value, accent }) {
  const colorMap = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    muted: "text-muted-foreground",
  };
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-lg font-semibold ${colorMap[accent] || ""}`}>
        ₹ {value.toFixed(2)}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    paid: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    partial: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    unpaid: "bg-red-100 text-red-700 hover:bg-red-100",
  };
  return <Badge className={map[status] || ""}>{status}</Badge>;
}
