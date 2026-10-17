import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, Users, ArrowUpDown } from "lucide-react";

import { listCustomers } from "../api/customers";

import { Input } from "@/components/ui/input";
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

export default function Customers() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("outstanding");
  const [showOnlyDebtors, setShowOnlyDebtors] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", { search }],
    queryFn: () => listCustomers({ search }),
  });

  const filtered = useMemo(() => {
    let list = customers;
    if (showOnlyDebtors) {
      list = list.filter((c) => Number(c.outstanding) > 0);
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return (Number(b.outstanding) || 0) - (Number(a.outstanding) || 0);
    });
  }, [customers, sortBy, showOnlyDebtors]);

  const totalOwed = customers.reduce(
    (s, c) => s + Math.max(0, Number(c.outstanding) || 0),
    0
  );
  const debtorCount = customers.filter((c) => Number(c.outstanding) > 0).length;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Credit customers and their outstanding balances"
        actions={
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Owed to us
            </div>
            <div className="text-xl font-semibold text-red-600">
              ₹ {totalOwed.toFixed(2)}
            </div>
          </div>
        }
      />

      <Card className="p-3 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-56">
              <ArrowUpDown className="size-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outstanding">
                Sort: biggest debtor first
              </SelectItem>
              <SelectItem value="name">Sort: by name</SelectItem>
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyDebtors}
              onChange={(e) => setShowOnlyDebtors(e.target.checked)}
              className="rounded"
            />
            Only customers who owe
          </label>

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {customers.length} customers •{" "}
            {debtorCount} with balance
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={4} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              customers.length === 0
                ? "No customers yet"
                : "No customers match"
            }
            description={
              customers.length === 0
                ? "Customers are created automatically when a partial / unpaid sale needs one."
                : "Try clearing the search or the “only debtors” filter."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Outstanding ₹</TableHead>
                <TableHead className="text-right w-25">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const out = Number(c.outstanding) || 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/customers/${c.id}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {out > 0 && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                          ₹ {out.toFixed(2)}
                        </Badge>
                      )}
                      {out === 0 && (
                        <span className="text-muted-foreground text-sm">
                          Settled
                        </span>
                      )}
                      {out < 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Advance ₹ {Math.abs(out).toFixed(2)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/customers/${c.id}`}>
                        <span className="text-sm text-emerald-600 hover:underline">
                          Ledger
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}