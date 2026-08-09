"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, getMonthlyEquivalent, type FixedExpenseRow } from "@/lib/finance";
import type { HouseholdSnapshot } from "@/lib/household-store";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Props = {
  fixedExpenses: FixedExpenseRow[];
  onChange: (next: FixedExpenseRow[]) => void;
};

type FixedExpenseDraft = {
  id?: string;
  name: string;
  amount: string;
  frequency: FixedExpenseRow["frequency"];
  paidBy: FixedExpenseRow["paidBy"];
};

const emptyDraft: FixedExpenseDraft = {
  name: "",
  amount: "",
  frequency: "monthly",
  paidBy: "Joint",
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

export function FixedExpensesTable({ fixedExpenses, onChange }: Props) {
  const [draft, setDraft] = useState<FixedExpenseDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const monthlyTotal = useMemo(
    () => fixedExpenses.reduce((total, item) => total + getMonthlyEquivalent(item.amount, item.frequency), 0),
    [fixedExpenses]
  );

  const beginEdit = (expense: FixedExpenseRow) => {
    setEditingId(expense.id);
    setDraft({
      id: expense.id,
      name: expense.name,
      amount: String(expense.amount),
      frequency: expense.frequency,
      paidBy: expense.paidBy,
    });
  };

  const clearDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const saveDraft = async () => {
    if (!draft.name.trim() || Number(draft.amount) <= 0) return;
    setBusy(true);
    try {
      const { snapshot } = await mutateHousehold({
        action: "saveFixedExpense",
        payload: {
          id: draft.id,
          name: draft.name,
          amount: Number(draft.amount),
          frequency: draft.frequency,
          paidBy: draft.paidBy,
        },
      });
      onChange(snapshot.fixedExpenses);
      clearDraft();
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (id: string) => {
    setBusy(true);
    try {
      const { snapshot } = await mutateHousehold({ action: "deleteFixedExpense", id });
      onChange(snapshot.fixedExpenses);
      if (editingId === id) clearDraft();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Fixed expenses</CardTitle>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Edit recurring bills inline and keep the monthly total current.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {formatCurrency(monthlyTotal)} / month
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4 dark:border-slate-700 dark:bg-slate-800/40">
          <Input
            value={draft.name}
            placeholder="Expense name"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <Input
            value={draft.amount}
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
          />
          <Select
            value={draft.frequency}
            onValueChange={(value) => setDraft({ ...draft, frequency: value as FixedExpenseRow["frequency"] })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </Select>
          <Select
            value={draft.paidBy}
            onValueChange={(value) => setDraft({ ...draft, paidBy: value as FixedExpenseRow["paidBy"] })}
          >
            <option value="Joint">Joint</option>
            <option value="Harrison">Harrison</option>
            <option value="Fernanda">Fernanda</option>
          </Select>
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <Button onClick={saveDraft} disabled={busy}>
              {editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingId ? "Update fixed expense" : "Add fixed expense"}
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
              <TableHead>Expense</TableHead>
              <TableHead>Paid by</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="text-right">Monthly equivalent</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fixedExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{expense.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Base amount {formatCurrency(expense.amount)}</div>
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400">{expense.paidBy}</TableCell>
                <TableCell className="text-slate-500 capitalize dark:text-slate-400">{expense.frequency}</TableCell>
                <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(getMonthlyEquivalent(expense.amount, expense.frequency))}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => beginEdit(expense)} disabled={busy}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRow(expense.id)} disabled={busy}>
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
