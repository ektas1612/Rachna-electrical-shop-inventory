import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
  getCustomer,
  getCustomerLedger,
  recordCreditPayment,
} from "../api/customers";

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

import EmptyState from "@/components/common/EmptyState";
import TableSkeleton from "@/components/common/TableSkeleton";

export default function CustomerLedger() {
  const { id } = useParams();
  const customerId = Number(id);
  const queryClient = useQueryClient();

  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(customerId),
  });

  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ["customer-ledger", customerId],
    queryFn: () => getCustomerLedger(customerId),
  });

  const mutation = useMutation({
    mutationFn: recordCreditPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-ledger", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Payment recorded");
      closePayment();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function closePayment() {
    setShowPayment(false);
    setAmount("");
    setMode("cash");
    setNotes("");
    setErrorMsg("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!amount || Number(amount) <= 0)
      return setErrorMsg("Enter a positive amount.");

    mutation.mutate({
      customer_id: customerId,
      amount: Number(amount),
      payment_mode: mode,
      notes: notes.trim() || null,
    });
  }

  const outstanding = Number(customer?.outstanding) || 0;

  return (
    <div>
      <div className="mb-4">
        <Link to="/customers">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="size-4" />
            Back to Customers
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {customer?.name || `Customer #${customerId}`}
          </h1>
          {customer?.phone && (
            <p className="text-sm text-muted-foreground mt-1">
              {customer.phone}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Outstanding
            </div>
            <div
              className={`text-xl font-semibold ${
                outstanding > 0
                  ? "text-red-600"
                  : outstanding < 0
                  ? "text-emerald-600"
                  : "text-muted-foreground"
              }`}
            >
              ₹ {Math.abs(outstanding).toFixed(2)}
              {outstanding < 0 && (
                <span className="text-xs font-normal ml-1">(advance)</span>
              )}
            </div>
          </div>
          <Button onClick={() => setShowPayment(true)}>
            <Plus className="size-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : ledger.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No ledger entries yet"
            description="Sales and payments for this customer will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit (sale) ₹</TableHead>
                <TableHead className="text-right">Credit (paid) ₹</TableHead>
                <TableHead className="text-right">Balance ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((row, i) => {
                const bal = Number(row.running_balance);
                return (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">
                      {row.date}
                    </TableCell>
                    <TableCell>
                      {row.kind === "sale" ? (
                        <Badge variant="secondary" className="mr-2">
                          Sale
                        </Badge>
                      ) : (
                        <Badge className="mr-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Payment
                        </Badge>
                      )}
                      <span className="text-sm">{row.description}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(row.debit) > 0
                        ? `₹ ${Number(row.debit).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-emerald-700">
                      {Number(row.credit) > 0
                        ? `₹ ${Number(row.credit).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        bal > 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      ₹ {Math.abs(bal).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showPayment} onOpenChange={(o) => !o && closePayment()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount ₹ *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
                className="text-right"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closePayment}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}