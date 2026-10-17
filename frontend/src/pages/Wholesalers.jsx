import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  listWholesalers,
  createWholesaler,
  updateWholesaler,
  deactivateWholesaler,
} from "../api/wholesalers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card } from "@/components/ui/card";

import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import TableSkeleton from "@/components/common/TableSkeleton";

const emptyForm = { name: "", phone: "", notes: "" };

export default function Wholesalers() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: wholesalers = [], isLoading } = useQuery({
    queryKey: ["wholesalers", { search }],
    queryFn: () => listWholesalers({ search }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["wholesalers"] });

  const createMutation = useMutation({
    mutationFn: createWholesaler,
    onSuccess: () => {
      invalidate();
      toast.success("Wholesaler added");
      closeForm();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateWholesaler(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Wholesaler updated");
      closeForm();
    },
    onError: (e) => setErrorMsg(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateWholesaler,
    onSuccess: () => {
      invalidate();
      toast.success("Wholesaler deactivated");
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrorMsg("");
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setErrorMsg("");
  }

  function openEdit(w) {
    setForm({
      name: w.name,
      phone: w.phone || "",
      notes: w.notes || "",
    });
    setEditingId(w.id);
    setShowForm(true);
    setErrorMsg("");
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Wholesalers"
        subtitle="The suppliers you buy from"
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add Wholesaler
          </Button>
        }
      />

      <Card className="p-3 mb-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={4} />
          </div>
        ) : wholesalers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No wholesalers yet"
            description="Add the shops you buy stock from to start recording purchases."
            action={
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                Add Wholesaler
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right w-30">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wholesalers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {w.phone || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-md">
                    {w.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(w)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(w)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Wholesaler" : "Add Wholesaler"}
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving…"
                  : editingId
                  ? "Save changes"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this wholesaler?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” will be hidden from listings. Existing
              purchases and balances are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}