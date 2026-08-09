import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SettlementResult } from "@/lib/finance";
import { CheckCircle2 } from "lucide-react";

export function MonthlySettlementCard({
  settlement,
  settled = false,
  allSettled = false,
}: {
  settlement: SettlementResult;
  settled?: boolean;
  allSettled?: boolean;
}) {
  const topLine = allSettled
    ? "Every month is settled, so nobody owes anyone."
    : settled
      ? `${settlement.primaryTransfer?.from ?? "Someone"} has already transferred ${
          settlement.primaryTransfer?.amountDisplay ?? ""
        }. This month is settled.`
      : settlement.primaryTransfer
        ? `${settlement.primaryTransfer.from} owes ${settlement.primaryTransfer.to} ${settlement.primaryTransfer.amountDisplay}`
        : "No settlement needed this month.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly settlement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {settlement.monthLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{topLine}</p>
          </div>
          {settled ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              Settled
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {settlement.balances.map((balance) => (
            <div key={balance.person} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">{balance.person}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {balance.balanceDisplay}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{balance.caption}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          {settlement.explanation}
        </div>
      </CardContent>
    </Card>
  );
}
