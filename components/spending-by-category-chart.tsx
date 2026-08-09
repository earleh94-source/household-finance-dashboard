"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CategoryRow, ExpenseRow } from "@/lib/finance";

type ViewMode = "month" | "year";

function monthLabelFromKey(monthKey: string, pattern: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return format(new Date(year, month - 1, 1), pattern);
}

export function SpendingByCategoryChart({
  expenses,
  categories,
  initialMonth,
}: {
  expenses: ExpenseRow[];
  categories: CategoryRow[];
  initialMonth: string;
}) {
  const [mode, setMode] = useState<ViewMode>("month");
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialMonth.slice(0, 4));

  const monthOptions = useMemo(
    () =>
      Array.from(new Set(expenses.map((expense) => expense.monthKey)))
        .sort((a, b) => b.localeCompare(a))
        .map((key) => ({ key, label: monthLabelFromKey(key, "MMMM yyyy") })),
    [expenses]
  );

  const yearOptions = useMemo(
    () =>
      Array.from(new Set(expenses.map((expense) => expense.monthKey.slice(0, 4))))
        .sort((a, b) => b.localeCompare(a)),
    [expenses]
  );

  const sharedByCategory = useMemo(() => {
    const rows = expenses.filter((expense) => expense.monthKey === month && expense.splitMode === "shared");
    return categories
      .map((category) => ({
        label: category.name,
        amount: rows
          .filter((expense) => expense.categoryId === category.id)
          .reduce((sum, expense) => sum + expense.amount, 0),
        color: category.color,
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, categories, month]);

  const yearly = useMemo(() => {
    const monthsInYear = monthOptions
      .filter((option) => option.key.startsWith(year))
      .sort((a, b) => a.key.localeCompare(b.key));
    return monthsInYear.map((option) => {
      const entry: Record<string, string | number> = {
        key: option.key,
        label: monthLabelFromKey(option.key, "MMM"),
        total: 0,
      };
      for (const category of categories) {
        entry[category.id] = 0;
      }
      for (const expense of expenses) {
        if (expense.monthKey !== option.key) continue;
        if (expense.splitMode !== "shared") continue;
        const key = expense.categoryId;
        if (typeof entry[key] === "number") entry[key] = (entry[key] as number) + expense.amount;
        entry.total = (entry.total as number) + expense.amount;
      }
      return entry;
    });
  }, [expenses, categories, monthOptions, year]);

  const yearTotal = useMemo(
    () => yearly.reduce((sum, row) => sum + (row.total as number), 0),
    [yearly]
  );

  const yearLabel = year;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Spending by category</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
            {(["month", "year"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setMode(view)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition",
                  mode === view
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                )}
              >
                {view === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "month" ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">View month</label>
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
              >
                {monthOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {monthOptions.find((option) => option.key === month)?.label ?? month} ·{" "}
              {sharedByCategory.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-AU", {
                style: "currency",
                currency: "AUD",
                maximumFractionDigits: 0,
              })}{" "}
              shared
            </p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sharedByCategory} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={70} tick={{ fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                  <Tooltip
                    cursor={{ fill: "rgba(100, 116, 139, 0.08)" }}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      backgroundColor: "rgba(255,255,255,0.97)",
                    }}
                    formatter={(value: number | string) => [
                      Number(value).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }),
                      undefined,
                    ]}
                  />
                  <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
                    {sharedByCategory.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">View year</label>
              <select
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {yearLabel} total ·{" "}
                {yearTotal.toLocaleString("en-AU", {
                  style: "currency",
                  currency: "AUD",
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Each bar is a month, stacked by category, showing cumulative shared spending.
            </p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearly} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                  <Tooltip
                    cursor={{ fill: "rgba(100, 116, 139, 0.08)" }}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      backgroundColor: "rgba(255,255,255,0.97)",
                    }}
                    formatter={(value: number | string, name: string) => [
                      Number(value).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }),
                      name,
                    ]}
                  />
                  {categories.map((category) => (
                    <Bar
                      key={category.id}
                      dataKey={category.id}
                      stackId="year"
                      name={category.name}
                      fill={category.color}
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(mode === "month" ? sharedByCategory : categories).map((category) => {
            const label = "label" in category ? category.label : category.name;
            return (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                {label}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
