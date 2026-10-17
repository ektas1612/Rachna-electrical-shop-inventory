import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { listBalances, createPayment } from "../api/purchases";

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

import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import TableSkeleton from "@/components/common/TableSkeleton";

export default function WholesalerBalances() {
  const queryClient = useQueryClient();

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["wholesaler-balances"],
    queryFn: listBalances,
  });

  const [showPayment, setShowPayment] = useState(false);
  const [payWholesalerId, setPayWholesalerId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [payReference, setPayReference] = useState("");

  const paymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesaler-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Payment recorded");
      closePayment();
    },
    onError: (e) => setErrMsg(e.message),
  });

  function openPayment() {
    setPayWholesalerId("");
    setPayAmount("");
    setPayMode("cash");
    setPayNotes("");
    setErrMsg("");
    setShowPayment(true);
    setPayReference("");
  }

  function closePayment() {
    setShowPayment(false);
    setPayReference("");
  }

  function handlePaySubmit(e) {
    e.preventDefault();
    setErrMsg("");
    if (!payWholesalerId) return setErrMsg("Pick a wholesaler.");
    if (!payAmount || Number(payAmount) <= 0)
      return setErrMsg("Enter a positive amount.");

    paymentMutation.mutate({
      wholesaler_id: Number(payWholesalerId),
      amount: Number(payAmount),
      payment_mode: payMode,
      reference: payReference.trim() || null,
      notes: payNotes.trim() || null,
    });
  }

  const totalWeOwe = balances
    .filter((b) => Number(b.balance) > 0)
    .reduce((s, b) => s + Number(b.balance), 0);
  const totalAdvance = balances
    .filter((b) => Number(b.balance) < 0)
    .reduce((s, b) => s + Math.abs(Number(b.balance)), 0);

  return (
    <div>
      <PageHeader
        title="Wholesaler Ledger"
        subtitle="Balances with your suppliers"
        actions={
          <Button onClick={openPayment}>
            <Plus className="size-4" />
            Record Payment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            We owe
          </div>
          <div className="text-2xl font-semibold text-red-600 mt-1">
            ₹ {totalWeOwe.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            Advances paid
          </div>
          <div className="text-2xl font-semibold text-emerald-600 mt-1">
            ₹ {totalAdvance.toFixed(2)}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={3} cols={5} />
          </div>
        ) : balances.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No wholesalers yet"
            description="Add wholesalers to see their balances here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wholesaler</TableHead>
                <TableHead className="text-right">Opening ₹</TableHead>
                <TableHead className="text-right">Purchased ₹</TableHead>
                <TableHead className="text-right">Paid ₹</TableHead>
                <TableHead className="text-right">Balance ₹</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-25"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b) => {
                const bal = Number(b.balance);
                const isRed = bal > 0;
                const isGreen = bal < 0;
                return (
                  <TableRow key={b.wholesaler_id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/wholesaler-ledger/${b.wholesaler_id}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {b.wholesaler_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(b.opening_balance || 0) !== 0
                        ? `₹ ${Number(b.opening_balance).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ₹ {Number(b.total_purchased).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ₹ {Number(b.total_paid).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹ {Math.abs(bal).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {isRed && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                          You owe
                        </Badge>
                      )}
                      {isGreen && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Advance
                        </Badge>
                      )}
                      {!isRed && !isGreen && (
                        <Badge variant="secondary">Settled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/wholesaler-ledger/${b.wholesaler_id}`}>
                        <Button variant="ghost" size="sm">
                          Ledger
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showPayment} onOpenChange={(o) => !o && closePayment()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {errMsg && (
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
              {errMsg}
            </div>
          )}

          <form onSubmit={handlePaySubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Wholesaler *</Label>
              <Select
                value={payWholesalerId}
                onValueChange={setPayWholesalerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select wholesaler" />
                </SelectTrigger>
                <SelectContent>
                  {balances.map((b) => (
                    <SelectItem
                      key={b.wholesaler_id}
                      value={String(b.wholesaler_id)}
                    >
                      {b.wholesaler_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Amount ₹ *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                className="text-right"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={payMode} onValueChange={setPayMode}>
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
              <Label>Receipt # from wholesaler</Label>
              <Input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closePayment}>
                Cancel
              </Button>
              <Button type="submit" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? "Saving…" : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
