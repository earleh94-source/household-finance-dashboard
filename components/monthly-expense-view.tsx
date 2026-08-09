"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  calculateSettlement,
  formatCurrency,
  toMonthKey,
  type CategoryRow,
  type ExpenseRow,
  type MonthState,
} from "@/lib/finance";
import { format } from "date-fns";
import { CheckCircle2, CalendarDays, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { HouseholdSnapshot } from "@/lib/household-store";

type Props = {
  initialExpenses: ExpenseRow[];
  initialCategories: CategoryRow[];
  initialMonths: MonthState[];
};

const blankExpense: Omit<ExpenseRow, "id"> = {
  date: "",
  monthKey: "",
  description: "",
  categoryId: "",
  amount: 0,
  paidBy: "Harrison",
  splitMode: "shared",
  notes: "",
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

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function MonthlyExpenseView({ initialExpenses, initialCategories, initialMonths }: Props) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [categories, setCategories] = useState(initialCategories);
  const [months, setMonths] = useState(initialMonths);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState(blankExpense);
  const [newMonthForm, setNewMonthForm] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const monthsFromExpenses = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.monthKey))),
    [expenses]
  );

  const knownMonths = useMemo(() => {
    const keys = new Set<string>([...monthsFromExpenses, ...months.map((month) => month.monthKey)]);
    return Array.from(keys).sort((a, b) => b.localeCompare(a)).map((key) => ({
      key,
      label: monthLabel(key),
      settled: months.find((month) => month.monthKey === key)?.settled ?? false,
    }));
  }, [monthsFromExpenses, months]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => knownMonths[0]?.key ?? toMonthKey(new Date().toISOString()));

  const selectedSettled = knownMonths.find((month) => month.key === selectedMonth)?.settled ?? false;

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.monthKey === selectedMonth),
    [expenses, selectedMonth]
  );

  const monthTotal = useMemo(
    () => monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [monthExpenses]
  );

  const sharedExpenses = useMemo(
    () => monthExpenses.filter((expense) => expense.splitMode === "shared"),
    [monthExpenses]
  );

  const totals = useMemo(() => {
    const sharedSpent = sharedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const paidBy = {
      Harrison: sharedExpenses.filter((expense) => expense.paidBy === "Harrison").reduce((sum, expense) => sum + expense.amount, 0),
      Fernanda: sharedExpenses.filter((expense) => expense.paidBy === "Fernanda").reduce((sum, expense) => sum + expense.amount, 0),
    };
    return { sharedSpent, paidBy };
  }, [sharedExpenses]);

  const settlement = useMemo(() => calculateSettlement(expenses, selectedMonth), [expenses, selectedMonth]);

  const defaultCategoryId = categories[0]?.id ?? "";

  const startNewExpense = () => {
    setEditingId(null);
    setExpenseForm({
      ...blankExpense,
      date: `${selectedMonth}-01`,
      monthKey: selectedMonth,
      categoryId: defaultCategoryId,
    });
  };

  const editExpense = (expense: ExpenseRow) => {
    setEditingId(expense.id);
    setExpenseForm(expense);
    setStatus(`Editing ${expense.description}.`);
  };

  const saveExpense = async () => {
    if (!expenseForm.description.trim() || expenseForm.amount <= 0) {
      setStatus("Add a description and amount first.");
      return;
    }
    setBusy(true);
    try {
      const { snapshot } = await mutateHousehold({
        action: "saveExpense",
        payload: {
          ...expenseForm,
          monthKey: toMonthKey(expenseForm.date),
          id: editingId ?? undefined,
        },
      });
      setExpenses(snapshot.expenses);
      setCategories(snapshot.categories);
      setSelectedMonth(toMonthKey(expenseForm.date));
      setEditingId(null);
      setExpenseForm(blankExpense);
      setStatus(editingId ? "Expense updated." : "Expense added.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  };

  const deleteExpense = async (id: string) => {
    setBusy(true);
    try {
      const { snapshot } = await mutateHousehold({ action: "deleteExpense", id });
      setExpenses(snapshot.expenses);
      setCategories(snapshot.categories);
      if (editingId === id) {
        setEditingId(null);
        setExpenseForm(blankExpense);
      }
      setStatus("Expense deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete expense.");
    } finally {
      setBusy(false);
    }
  };

  const createNewMonth = async () => {
    if (!newMonthForm) return;
    setBusy(true);
    try {
      const { snapshot } = await mutateHousehold({
        action: "saveMonth",
        payload: { monthKey: newMonthForm, settled: false },
      });
      setMonths(snapshot.months);
      setSelectedMonth(newMonthForm);
      setNewMonthForm("");
      setStatus(`Created ${monthLabel(newMonthForm)}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create month.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSettled = async () => {
    setBusy(true);
    try {
      const next = !selectedSettled;
      const { snapshot } = await mutateHousehold({
        action: "saveMonth",
        payload: { monthKey: selectedMonth, settled: next },
      });
      setMonths(snapshot.months);
      setStatus(next ? `${monthLabel(selectedMonth)} marked as settled.` : `${monthLabel(selectedMonth)} marked as unsettled.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update settlement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                {knownMonths.map((month) => (
                  <option key={month.key} value={month.key}>
                    {month.label}
                    {month.settled ? " ✓" : ""}
                  </option>
                ))}
              </Select>
            </div>
            {selectedSettled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4" />
                Settled
              </span>
            ) : null}
            <Button variant="secondary" onClick={toggleSettled} disabled={busy || monthExpenses.length === 0}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {selectedSettled ? "Mark unsettled" : "Mark settled"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="month"
              value={newMonthForm}
              onChange={(event) => setNewMonthForm(event.target.value)}
              placeholder="Add a new month"
              className="h-10 w-auto"
            />
            <Button onClick={createNewMonth} disabled={busy || !newMonthForm}>
              <Plus className="mr-2 h-4 w-4" />
              New month
            </Button>
            <Button onClick={startNewExpense}>
              <Plus className="mr-2 h-4 w-4" />
              Add expense to {monthLabel(selectedMonth)}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500 dark:text-slate-400">Shared spending</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {formatCurrency(totals.sharedSpent)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {sharedExpenses.length} shared {sharedExpenses.length === 1 ? "expense" : "expenses"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500 dark:text-slate-400">Harrison paid</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {formatCurrency(totals.paidBy.Harrison)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">50% fair share is {formatCurrency(totals.sharedSpent / 2)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500 dark:text-slate-400">Fernanda paid</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {formatCurrency(totals.paidBy.Fernanda)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">50% fair share is {formatCurrency(totals.sharedSpent / 2)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500 dark:text-slate-400">Settlement</p>
          {selectedSettled ? (
            <>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">Settled</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {settlement.primaryTransfer?.from ?? "No one"} has paid {settlement.primaryTransfer?.amountDisplay ?? "the balance"}.
              </p>
            </>
          ) : settlement.primaryTransfer ? (
            <>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {settlement.primaryTransfer.amountDisplay}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {settlement.primaryTransfer.from} owes {settlement.primaryTransfer.to}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">Balanced</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No settlement needed this month.</p>
            </>
          )}
        </div>
      </div>

      {status ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">{status}</p>
      ) : null}

      {editingId !== null || expenseForm.description !== "" || expenseForm.date ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit expense" : "Add expense"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                value={expenseForm.description}
                placeholder="Description"
                onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })}
              />
              <Input
                value={expenseForm.amount || ""}
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                onChange={(event) => setExpenseForm({ ...expenseForm, amount: Number(event.target.value || 0) })}
              />
              <Select
                value={expenseForm.categoryId}
                onValueChange={(value) => setExpenseForm({ ...expenseForm, categoryId: value })}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select
                value={expenseForm.paidBy}
                onValueChange={(value) => setExpenseForm({ ...expenseForm, paidBy: value as ExpenseRow["paidBy"] })}
              >
                <option value="Harrison">Harrison</option>
                <option value="Fernanda">Fernanda</option>
              </Select>
              <Select
                value={expenseForm.splitMode}
                onValueChange={(value) =>
                  setExpenseForm({ ...expenseForm, splitMode: value as ExpenseRow["splitMode"] })
                }
              >
                <option value="shared">Shared</option>
                <option value="personal">Personal</option>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveExpense} disabled={busy}>
                <Plus className="mr-2 h-4 w-4" />
                {editingId ? "Update expense" : "Save expense"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setExpenseForm(blankExpense);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{monthLabel(selectedMonth)} ledger</CardTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {monthExpenses.length} entries · total {formatCurrency(monthExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{settlement.explanation}</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Details</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{expense.description}</div>
                    {expense.notes ? <div className="text-sm text-slate-500 dark:text-slate-400">{expense.notes}</div> : null}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            categories.find((category) => category.id === expense.categoryId)?.color ?? "#0f766e",
                        }}
                      />
                      {categories.find((category) => category.id === expense.categoryId)?.name ?? "Uncategorized"}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">{expense.paidBy}</TableCell>
                  <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => editExpense(expense)} disabled={busy}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)} disabled={busy}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {monthExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No expenses yet for {monthLabel(selectedMonth)}. Add your first one above.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-slate-900 dark:text-slate-100">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(monthTotal)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
