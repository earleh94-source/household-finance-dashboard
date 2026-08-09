"use client";

import { useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { MonthlySettlementCard } from "@/components/monthly-settlement-card";
import { SpendingByCategoryChart } from "@/components/spending-by-category-chart";
import { FixedExpensesTable } from "@/components/fixed-expenses-table";
import { computeDashboardSummary, type CategoryRow, type ExpenseRow, type FixedExpenseRow, type MonthState, type OffsetContributionRow } from "@/lib/finance";
import { DollarSign, Receipt, Scale, CircleDollarSign } from "lucide-react";

type Props = {
  expenses: ExpenseRow[];
  categories: CategoryRow[];
  fixedExpenses: FixedExpenseRow[];
  offsetContributions: OffsetContributionRow[];
  months: MonthState[];
};

export function DashboardView({ expenses, categories, fixedExpenses, offsetContributions, months }: Props) {
  const [liveExpenses] = useState(expenses);
  const [liveCategories] = useState(categories);
  const [liveFixedExpenses, setLiveFixedExpenses] = useState(fixedExpenses);

  const summary = useMemo(
    () => computeDashboardSummary(liveExpenses, liveCategories, liveFixedExpenses, offsetContributions),
    [liveExpenses, liveCategories, liveFixedExpenses, offsetContributions]
  );

  const settled = useMemo(
    () => months.find((month) => month.monthKey === summary.monthKey)?.settled ?? false,
    [months, summary.monthKey]
  );

  const allSettled = useMemo(() => {
    if (months.length === 0) return false;
    return months.every((month) => month.settled);
  }, [months]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Shared spending"
          value={summary.sharedSpentDisplay}
          detail={`${summary.sharedExpenseCount} shared expenses this month`}
          icon={Receipt}
        />
        <MetricCard
          title="Monthly settlement"
          value={settled ? "Settled" : summary.settlementDisplay}
          detail={allSettled ? "All months settled" : summary.settlementDetail}
          icon={Scale}
        />
        <MetricCard
          title="Fixed monthly costs"
          value={summary.fixedMonthlyDisplay}
          detail="Recurring commitments normalized to a monthly view"
          icon={DollarSign}
        />
        <MetricCard
          title="Offset contributions"
          value={summary.offsetTotalDisplay}
          detail={`${summary.offsetCount} deposits recorded`}
          icon={CircleDollarSign}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MonthlySettlementCard settlement={summary.settlement} settled={settled} allSettled={allSettled} />
        <SpendingByCategoryChart expenses={liveExpenses} categories={liveCategories} initialMonth={summary.monthKey} />
      </div>

      <FixedExpensesTable fixedExpenses={liveFixedExpenses} onChange={setLiveFixedExpenses} />
    </div>
  );
}
