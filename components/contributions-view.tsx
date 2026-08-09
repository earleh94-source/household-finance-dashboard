"use client";

import { useMemo, useState } from "react";
import { OffsetContributionsPanel } from "@/components/offset-contributions-panel";
import { formatCurrency, type OffsetContributionRow } from "@/lib/finance";
import { Coins, User } from "lucide-react";

type Props = {
  contributions: OffsetContributionRow[];
};

export function ContributionsView({ contributions }: Props) {
  const [liveContributions, setLiveContributions] = useState(contributions);

  const totals = useMemo(() => {
    const harrison = liveContributions
      .filter((item) => item.person === "Harrison")
      .reduce((sum, item) => sum + item.amount, 0);
    const fernanda = liveContributions
      .filter((item) => item.person === "Fernanda")
      .reduce((sum, item) => sum + item.amount, 0);
    const total = harrison + fernanda;
    return { harrison, fernanda, total };
  }, [liveContributions]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total contributed</p>
            <Coins className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {formatCurrency(totals.total)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {liveContributions.length} {liveContributions.length === 1 ? "payment" : "payments"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Harrison</p>
            <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {formatCurrency(totals.harrison)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {liveContributions.filter((item) => item.person === "Harrison").length} payments
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Fernanda</p>
            <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {formatCurrency(totals.fernanda)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {liveContributions.filter((item) => item.person === "Fernanda").length} payments
          </p>
        </div>
      </div>

      <OffsetContributionsPanel contributions={liveContributions} onChange={setLiveContributions} />
    </div>
  );
}
