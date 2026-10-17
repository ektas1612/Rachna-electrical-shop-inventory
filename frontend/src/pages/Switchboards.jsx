import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench, PackageCheck, PackageX, AlertTriangle, CheckCircle2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import {
  listSwitchboards,
  sellSwitchboard,
  damageSwitchboard,
  dismantleSwitchboard,
  switchboardStats,
} from "../api/switchboards";
import BuildSwitchboardModal from "../components/BuildSwitchboardModals";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import TableSkeleton from "@/components/common/TableSkeleton";

export default function Switchboards() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("available");
  const [showBuild, setShowBuild] = useState(false);
  const [sellBoard, setSellBoard] = useState(null);
  const [damageTarget, setDamageTarget] = useState(null);
  const [dismantleTarget, setDismantleTarget] = useState(null);

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ["switchboards", { statusFilter }],
    queryFn: () =>
      listSwitchboards({ status: statusFilter || undefined }),
  });

  const { data: stats } = useQuery({
    queryKey: ["switchboard-stats"],
    queryFn: switchboardStats,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["switchboards"] });
    queryClient.invalidateQueries({ queryKey: ["switchboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const damageMutation = useMutation({
    mutationFn: damageSwitchboard,
    onSuccess: () => {
      invalidate();
      toast.success("Marked as damaged");
      setDamageTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const dismantleMutation = useMutation({
    mutationFn: dismantleSwitchboard,
    onSuccess: () => {
      invalidate();
      toast.success("Components returned to stock");
      setDismantleTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Switchboards"
        subtitle="Pre-built switchboards and their component consumption"
        actions={
          <Button onClick={() => setShowBuild(true)}>
            <Plus className="size-4" />
            Build Switchboard
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <StatTile
            label="Built"
            value={stats.total_built}
            icon={Wrench}
            color="text-slate-600"
          />
          <StatTile
            label="Available"
            value={stats.total_available}
            icon={PackageCheck}
            color="text-emerald-600"
          />
          <StatTile
            label="Sold"
            value={stats.total_sold}
            icon={CheckCircle2}
            color="text-slate-600"
          />
          <StatTile
            label="Damaged"
            value={stats.total_damaged}
            icon={AlertTriangle}
            color="text-red-600"
          />
          <StatTile
            label="Dismantled"
            value={stats.total_dismantled}
            icon={Undo2}
            color="text-amber-600"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="sold">Sold</TabsTrigger>
          <TabsTrigger value="damaged">Damaged</TabsTrigger>
          <TabsTrigger value="dismantled">Dismantled</TabsTrigger>
          <TabsTrigger value="">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={7} />
          </div>
        ) : boards.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={`No ${statusFilter || ""} switchboards yet`.trim()}
            description="Build a switchboard to record the components it uses."
            action={
              statusFilter === "available" && (
                <Button onClick={() => setShowBuild(true)}>
                  <Plus className="size-4" />
                  Build Switchboard
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Built</TableHead>
                <TableHead className="text-right">Cost ₹</TableHead>
                <TableHead className="text-right">Listed ₹</TableHead>
                <TableHead className="text-right">Sold ₹</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-55">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boards.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {b.code || "—"}
                  </TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.built_date}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ₹ {Number(b.material_cost).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹ {Number(b.listed_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {b.actual_sold_price != null
                      ? `₹ ${Number(b.actual_sold_price).toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {b.status === "available" && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSellBoard(b)}
                        >
                          Sell
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700"
                          onClick={() => setDismantleTarget(b)}
                        >
                          Dismantle
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDamageTarget(b)}
                        >
                          Damage
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Stuck components */}
      {stats && stats.stuck_components.length > 0 && (
        <Card className="p-4 mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Components locked in unsold boards
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {stats.stuck_components.map((c) => (
              <div
                key={c.product_id}
                className="flex justify-between px-3 py-1.5 bg-muted/50 rounded-md"
              >
                <span className="text-muted-foreground truncate">
                  {c.product_name}
                </span>
                <span className="font-medium ml-2">
                  {Number(c.quantity_locked)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      {showBuild && <BuildSwitchboardModal onClose={() => setShowBuild(false)} />}

      {sellBoard && (
        <SellModal
          board={sellBoard}
          onClose={() => setSellBoard(null)}
          onSuccess={invalidate}
        />
      )}

      <AlertDialog
        open={!!damageTarget}
        onOpenChange={(o) => !o && setDamageTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as damaged?</AlertDialogTitle>
            <AlertDialogDescription>
              “{damageTarget?.name} ({damageTarget?.code})” will be marked as
              damaged. The components already used will NOT return to stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => damageMutation.mutate({ board_id: damageTarget.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Mark Damaged
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!dismantleTarget}
        onOpenChange={(o) => !o && setDismantleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismantle this board?</AlertDialogTitle>
            <AlertDialogDescription>
              All components from “{dismantleTarget?.name}” will return to stock
              at their original cost. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dismantleMutation.mutate({ board_id: dismantleTarget.id })
              }
            >
              Dismantle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color }) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className={`text-xl font-semibold mt-1 ${color}`}>{value}</p>
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </div>
    </Card>
  );
}

function StatusBadge({ status }) {
  const map = {
    available: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    sold: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    damaged: "bg-red-100 text-red-700 hover:bg-red-100",
    dismantled: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  };
  return <Badge className={map[status] || ""}>{status}</Badge>;
}

function SellModal({ board, onClose, onSuccess }) {
  const [actualPrice, setActualPrice] = useState(
    Number(board.listed_price).toFixed(2)
  );
  const [paidInFull, setPaidInFull] = useState(true);
  const [payMethod, setPayMethod] = useState("cash");
  const [cashInput, setCashInput] = useState(0);
  const [upiInput, setUpiInput] = useState(0);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const total = Number(actualPrice) || 0;

  let derivedCash = 0,
    derivedUpi = 0;
  if (paidInFull) {
    if (payMethod === "cash") derivedCash = total;
    else if (payMethod === "upi") derivedUpi = total;
    else {
      derivedCash = Number(cashInput) || 0;
      derivedUpi = Number(upiInput) || 0;
    }
  } else {
    derivedCash = Number(cashInput) || 0;
    derivedUpi = Number(upiInput) || 0;
  }
  const totalPaid = derivedCash + derivedUpi;
  const due = Math.max(0, total - totalPaid);

  const mutation = useMutation({
    mutationFn: sellSwitchboard,
    onSuccess: () => {
      onSuccess();
      toast.success("Board sold");
      onClose();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (total <= 0) return setErrorMsg("Enter a positive price.");
    if (due > 0)
      return setErrorMsg(
        "Partial / unpaid board sales aren't supported here. Record the full payment first, or use the Sale page."
      );

    mutation.mutate({
      board_id: board.id,
      actual_price: total,
      cash_paid: derivedCash,
      upi_paid: derivedUpi,
      notes: notes.trim() || null,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sell Switchboard</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-xs text-muted-foreground">
          {board.code} — {board.name}
        </p>

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Actual sold price ₹ *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              required
              className="text-right"
            />
            <p className="text-xs text-muted-foreground">
              Listed: ₹ {Number(board.listed_price).toFixed(2)} — edit if
              bargained.
            </p>
          </div>

          <Card className="p-3 bg-muted/40">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="inline-flex rounded-md border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setPaidInFull(true)}
                  className={`px-3 py-1.5 ${
                    paidInFull
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                >
                  Paid in full
                </button>
                <button
                  type="button"
                  onClick={() => setPaidInFull(false)}
                  className={`px-3 py-1.5 border-l ${
                    !paidInFull
                      ? "bg-amber-500 text-white"
                      : "bg-background"
                  }`}
                >
                  Partial
                </button>
              </div>

              <div className="flex items-center gap-1">
                {["cash", "upi", "mixed"].map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={payMethod === m ? "default" : "outline"}
                    onClick={() => setPayMethod(m)}
                  >
                    {m.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {(payMethod === "mixed" || !paidInFull) && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Cash ₹"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="text-right"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="UPI ₹"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  className="text-right"
                />
              </div>
            )}

            <div className="flex justify-between text-sm bg-background rounded px-3 py-2 border">
              <span>
                Paid: <b>₹ {totalPaid.toFixed(2)}</b>
              </span>
              <span
                className={
                  due > 0
                    ? "text-red-600 font-bold"
                    : "text-emerald-600 font-semibold"
                }
              >
                Due: <b>₹ {due.toFixed(2)}</b>
              </span>
            </div>
          </Card>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Sell Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}