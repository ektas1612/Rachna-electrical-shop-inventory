import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Undo2, X } from "lucide-react";

import { listReturns } from "../api/wholesalerReturns";
import { listWholesalers } from "../api/wholesalers";
import WholesalerReturnForm from "../components/WholesalerReturnForm";

import { Button } from "@/components/ui/button";
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

export default function WholesalerReturns() {
  const [showForm, setShowForm] = useState(false);
  const [wholesalerFilter, setWholesalerFilter] = useState("");

  const { data: wholesalers = [] } = useQuery({
    queryKey: ["wholesalers"],
    queryFn: () => listWholesalers({}),
  });

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["wholesaler-returns", { wholesalerFilter }],
    queryFn: () =>
      listReturns({
        wholesalerId: wholesalerFilter ? Number(wholesalerFilter) : undefined,
      }),
  });

  const totalReturned = returns.reduce(
    (s, r) => s + Number(r.total_amount),
    0
  );

  return (
    <div>
      <PageHeader
        title="Wholesaler Returns"
        subtitle="Stock sent back to suppliers"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="size-4" />
            New Return
          </Button>
        }
      />

      <Card className="p-3 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="space-y-1.5">
            <Label className="text-xs">Wholesaler</Label>
            <Select
              value={wholesalerFilter}
              onValueChange={setWholesalerFilter}
            >
              <SelectTrigger className="w-52">
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

          {wholesalerFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWholesalerFilter("")}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}

          {!isLoading && returns.length > 0 && (
            <div className="ml-auto text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Filtered total
              </div>
              <div className="text-lg font-semibold text-red-600">
                ₹ {totalReturned.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : returns.length === 0 ? (
          <EmptyState
            icon={Undo2}
            title={wholesalerFilter ? "No returns for this wholesaler" : "No returns yet"}
            description={
              wholesalerFilter
                ? "Try clearing the filter."
                : "Returns reduce what you owe the wholesaler."
            }
            action={
              !wholesalerFilter && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="size-4" />
                  New Return
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
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">
                    {r.return_date}
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.wholesaler_name || `#${r.wholesaler_id}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {r.reference || "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.items?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                      ₹ {Number(r.total_amount).toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-60">
                    {r.notes || ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {showForm && (
        <WholesalerReturnForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}