"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatMonth, currentMonthKey, type OffsetContributionRow } from "@/lib/finance";
import type { HouseholdSnapshot } from "@/lib/household-store";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Props = {
  contributions: OffsetContributionRow[];
  onChange: (next: OffsetContributionRow[]) => void;
};

type ContributionDraft = {
  id?: string;
  month: string;
  person: OffsetContributionRow["person"];
  description: string;
  amount: string;
};

const emptyDraft: ContributionDraft = {
  month: currentMonthKey(),
  person: "Harrison",
  description: "",
  amount: "",
};

async function mutateHousehold(body: unknown) {
  const response = await fetch("/api/household", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? "Unable to save changes.");
  }

  return (await response.json()) as { snapshot: HouseholdSnapshot };
}

export function OffsetContributionsPanel({ contributions, onChange }: Props) {
  const [draft, setDraft] = useState<ContributionDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => contributions.reduce((sum, item) => sum + item.amount, 0), [contributions]);
  const running = useMemo(
    () =>
      [...contributions]
        .sort((a, b) => a.date.localeCompare(b.date))
        .reduce((acc, item) => {
          const next = acc[acc.length - 1]?.runningTotal ?? 0;
          acc.push({ ...item, runningTotal: next + item.amount });
          return acc;
        }, [] as Array<OffsetContributionRow & { runningTotal: number }>)
        .reverse(),
    [contributions]
  );

  const beginEdit = (item: OffsetContributionRow) => {
    setEditingId(item.id);
    setDraft({
      id: item.id,
      month: item.date.slice(0, 7),
      person: item.person,
      description: item.description,
      amount: String(item.amount),
    });
  };

  const clearDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const saveDraft = async () => {
    if (!draft.description.trim() || Number(draft.amount) <= 0) return;
    setBusy(true);
    try {
      const { snapshot } = await mutateHousehold({
        action: "saveOffsetContribution",
        payload: {
          id: draft.id,
          date: `${draft.month}-01`,
          person: draft.person,
          description: draft.description,
          amount: Number(draft.amount),
        },
      });
      onChange(snapshot.offsetContributions);
      clearDraft();
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (id: string) => {
    setBusy(true);
    try {
      const { snapshot } = await mutateHousehold({ action: "deleteOffsetContribution", id });
      onChange(snapshot.offsetContributions);
      if (editingId === id) clearDraft();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Additional contributions</CardTitle>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Edit extra repayments and watch the running total update inline.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Total {formatCurrency(total)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4 dark:border-slate-700 dark:bg-slate-800/40">
          <Input
            type="month"
            value={draft.month}
            onChange={(event) => setDraft({ ...draft, month: event.target.value })}
          />
          <Select
            value={draft.person}
            onValueChange={(value) => setDraft({ ...draft, person: value as OffsetContributionRow["person"] })}
          >
            <option value="Harrison">Harrison</option>
            <option value="Fernanda">Fernanda</option>
          </Select>
          <Input
            value={draft.description}
            placeholder="Description"
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
          <Input
            value={draft.amount}
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
          />
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <Button onClick={saveDraft} disabled={busy}>
              {editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingId ? "Update contribution" : "Add contribution"}
            </Button>
            {editingId ? (
              <Button variant="secondary" onClick={clearDraft}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {running.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{formatMonth(item.date)}</TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400">{item.person}</TableCell>
                <TableCell>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{item.description}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Running total {formatCurrency(item.runningTotal)}</div>
                </TableCell>
                <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(item.amount)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => beginEdit(item)} disabled={busy}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRow(item.id)} disabled={busy}>
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
