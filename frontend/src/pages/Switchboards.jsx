import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSwitchboards,
  sellSwitchboard,
  damageSwitchboard,
  dismantleSwitchboard,
  switchboardStats,
} from "../api/switchboards";
import BuildSwitchboardModals from "../components/BuildSwitchboardModals";

export default function Switchboards() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("available");
  const [showBuild, setShowBuild] = useState(false);
  const [sellBoard, setSellBoard] = useState(null);
  const [damageId, setDamageId] = useState(null);
  const [dismantleId, setDismantleId] = useState(null);

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
      setDamageId(null);
    },
    onError: (e) => alert(e.message),
  });

  const dismantleMutation = useMutation({
    mutationFn: dismantleSwitchboard,
    onSuccess: () => {
      invalidate();
      setDismantleId(null);
    },
    onError: (e) => alert(e.message),
  });

  const tabs = [
    { key: "available", label: "Available" },
    { key: "sold", label: "Sold" },
    { key: "damaged", label: "Damaged" },
    { key: "dismantled", label: "Dismantled" },
    { key: "", label: "All" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Switchboards</h2>
        <button
          onClick={() => setShowBuild(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + Build Switchboard
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-4">
          <StatCard label="Built" value={stats.total_built} />
          <StatCard label="Available" value={stats.total_available} accent="emerald" />
          <StatCard label="Sold" value={stats.total_sold} />
          <StatCard label="Damaged" value={stats.total_damaged} accent="red" />
          <StatCard label="Dismantled" value={stats.total_dismantled} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              statusFilter === t.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : boards.length === 0 ? (
        <div className="text-slate-500">
          No {statusFilter || ""} switchboards yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Built</th>
                <th className="text-right px-3 py-2">Cost ₹</th>
                <th className="text-right px-3 py-2">Listed ₹</th>
                <th className="text-right px-3 py-2">Sold ₹</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {boards.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{b.code || "—"}</td>
                  <td className="px-3 py-2 font-medium">{b.name}</td>
                  <td className="px-3 py-2 text-slate-600">{b.built_date}</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    ₹ {Number(b.material_cost).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    ₹ {Number(b.listed_price).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {b.actual_sold_price != null
                      ? `₹ ${Number(b.actual_sold_price).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    {b.status === "available" && (
                      <>
                        <button
                          onClick={() => setSellBoard(b)}
                          className="text-emerald-600 hover:underline text-xs"
                        >
                          Sell
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Mark "${b.name} (${b.code})" as damaged? Stock will NOT be returned.`
                              )
                            )
                              damageMutation.mutate({ board_id: b.id });
                          }}
                          className="text-red-500 hover:underline text-xs"
                        >
                          Damage
                        </button>
                        <button
                          onClick={() => setDismantleId(b.id)}
                          className="text-slate-600 hover:underline text-xs"
                        >
                          Dismantle
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stuck components */}
      {stats && stats.stuck_components.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Components locked in unsold boards
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {stats.stuck_components.map((c) => (
              <div
                key={c.product_id}
                className="flex justify-between px-3 py-1 bg-slate-50 rounded"
              >
                <span className="text-slate-600 truncate">{c.product_name}</span>
                <span className="font-medium ml-2">
                  {Number(c.quantity_locked)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showBuild && (
        <BuildSwitchboardModals onClose={() => setShowBuild(false)} />
      )}

      {sellBoard && (
        <SellModal
          board={sellBoard}
          onClose={() => setSellBoard(null)}
          onSuccess={invalidate}
        />
      )}

      {damageId && null}

      {dismantleId && (
        <ConfirmModal
          title="Dismantle board?"
          message="Components will be returned to stock as fresh batches at their original cost. This cannot be undone."
          confirmLabel="Dismantle"
          onCancel={() => setDismantleId(null)}
          onConfirm={() => dismantleMutation.mutate({ board_id: dismantleId })}
          loading={dismantleMutation.isPending}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const colorMap = {
    emerald: "text-emerald-700",
    red: "text-red-600",
    amber: "text-amber-600",
  };
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${colorMap[accent] || "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    available: "bg-emerald-100 text-emerald-700",
    sold: "bg-slate-100 text-slate-700",
    damaged: "bg-red-100 text-red-700",
    dismantled: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[status] || ""}`}>
      {status}
    </span>
  );
}

function ConfirmModal({ title, message, confirmLabel, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded border text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 rounded bg-red-600 text-white text-sm disabled:opacity-50"
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SellModal({ board, onClose, onSuccess }) {
  const [actualPrice, setActualPrice] = useState(
    Number(board.listed_price).toFixed(2)
  );
  const [cashPaid, setCashPaid] = useState("");
  const [upiPaid, setUpiPaid] = useState("");
  const [paidInFull, setPaidInFull] = useState(true);
  const [payMethod, setPayMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const total = Number(actualPrice) || 0;

  let derivedCash = 0;
  let derivedUpi = 0;
  if (paidInFull) {
    if (payMethod === "cash") derivedCash = total;
    else if (payMethod === "upi") derivedUpi = total;
    else {
      derivedCash = Number(cashPaid) || 0;
      derivedUpi = Number(upiPaid) || 0;
    }
  } else {
    derivedCash = Number(cashPaid) || 0;
    derivedUpi = Number(upiPaid) || 0;
  }
  const totalPaid = derivedCash + derivedUpi;
  const due = Math.max(0, total - totalPaid);

  const mutation = useMutation({
    mutationFn: sellSwitchboard,
    onSuccess: () => {
      onSuccess();
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
        "Partial / unpaid board sales are not supported yet. Please collect full payment or use the standard Sale page."
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-1">Sell Switchboard</h3>
        <p className="text-xs text-slate-500 mb-4">
          {board.code} — {board.name}
        </p>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Actual sold price ₹ *
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              required
              className="w-full border rounded px-2 py-1 text-right"
            />
            <span className="text-xs text-slate-500">
              Listed: ₹ {Number(board.listed_price).toFixed(2)} — edit if
              bargained.
            </span>
          </label>

          <div className="border rounded-lg p-3 bg-slate-50">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Payment:
              </span>
              <div className="inline-flex rounded border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setPaidInFull(true)}
                  className={`px-3 py-1 ${
                    paidInFull
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-700"
                  }`}
                >
                  Paid in full
                </button>
                <button
                  type="button"
                  onClick={() => setPaidInFull(false)}
                  className={`px-3 py-1 border-l ${
                    !paidInFull
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-700"
                  }`}
                >
                  Partial
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2 text-sm">
              <span className="text-xs font-semibold text-slate-700">
                Method:
              </span>
              {["cash", "upi", "mixed"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`px-3 py-1 rounded text-xs border ${
                    payMethod === m
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {(payMethod === "mixed" || !paidInFull) && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-600 mb-1">
                    Cash ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashPaid}
                    onChange={(e) => setCashPaid(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-right"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-600 mb-1">
                    UPI ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={upiPaid}
                    onChange={(e) => setUpiPaid(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-right"
                  />
                </label>
              </div>
            )}

            <div className="text-sm bg-white rounded px-3 py-2 flex justify-between border">
              <span>
                Paid: <b>₹ {totalPaid.toFixed(2)}</b>
              </span>
              <span
                className={
                  due > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-semibold"
                }
              >
                Due: <b>₹ {due.toFixed(2)}</b>
              </span>
            </div>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Notes
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border text-slate-700 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Sell Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}