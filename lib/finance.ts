import { format } from "date-fns";

export type PaidBy = "Harrison" | "Fernanda";
export type SplitMode = "shared" | "personal";

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
};

export type ExpenseRow = {
  id: string;
  date: string;
  monthKey: string;
  description: string;
  categoryId: string;
  amount: number;
  paidBy: PaidBy;
  splitMode: SplitMode;
  notes?: string;
};

export type FixedExpenseRow = {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "quarterly" | "yearly";
  paidBy: PaidBy | "Joint";
};

export type OffsetContributionRow = {
  id: string;
  date: string;
  person: PaidBy;
  description: string;
  amount: number;
};

export type MonthState = {
  monthKey: string;
  settled: boolean;
};

export type SettlementBalance = {
  person: PaidBy;
  balance: number;
  balanceDisplay: string;
  caption: string;
};

export type TransferResult = {
  from: PaidBy;
  to: PaidBy;
  amount: number;
  amountDisplay: string;
};

export type SettlementResult = {
  monthKey: string;
  monthLabel: string;
  balances: SettlementBalance[];
  primaryTransfer: TransferResult | null;
  explanation: string;
};

export type CategorySeriesItem = {
  label: string;
  amount: number;
  color: string;
};

export type MonthlyHistoryRow = {
  monthKey: string;
  monthLabel: string;
  sharedSpentDisplay: string;
  settlementDisplay: string;
  sharedExpenseCount: number;
};

export type DashboardSummary = {
  monthKey: string;
  monthLabel: string;
  sharedSpent: number;
  sharedSpentDisplay: string;
  sharedExpenseCount: number;
  fixedMonthly: number;
  fixedMonthlyDisplay: string;
  offsetTotal: number;
  offsetTotalDisplay: string;
  offsetCount: number;
  settlement: SettlementResult;
  settlementDisplay: string;
  settlementDetail: string;
  categorySeries: CategorySeriesItem[];
  history: MonthlyHistoryRow[];
};

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function localDateFromKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return format(new Date(year, month - 1, day), "dd MMM");
}

function monthLabel(monthKey: string) {
  return format(localDateFromKey(monthKey), "MMMM yyyy");
}

function monthKeyFromDate(date: string) {
  return date.slice(0, 7);
}

function monthlyEquivalent(amount: number, frequency: FixedExpenseRow["frequency"]) {
  if (frequency === "quarterly") return amount / 3;
  if (frequency === "yearly") return amount / 12;
  return amount;
}

export function getMonthlyEquivalent(amount: number, frequency: FixedExpenseRow["frequency"]) {
  return monthlyEquivalent(amount, frequency);
}

export function calculateSettlement(expenses: ExpenseRow[], monthKey: string): SettlementResult {
  const sharedExpenses = expenses.filter((expense) => expense.monthKey === monthKey && expense.splitMode === "shared");
  const sharedTotal = sharedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const fairShare = sharedTotal / 2;
  const paid = {
    Harrison: sharedExpenses.filter((expense) => expense.paidBy === "Harrison").reduce((sum, expense) => sum + expense.amount, 0),
    Fernanda: sharedExpenses.filter((expense) => expense.paidBy === "Fernanda").reduce((sum, expense) => sum + expense.amount, 0),
  };

  const balances: SettlementBalance[] = (["Harrison", "Fernanda"] as const).map((person) => {
    const balance = paid[person] - fairShare;
    return {
      person,
      balance,
      balanceDisplay: balance >= 0 ? `+${formatCurrency(balance)}` : `-${formatCurrency(Math.abs(balance))}`,
      caption: balance >= 0 ? "Net credit" : "Net debit",
    };
  });

  const positive = balances.find((entry) => entry.balance > 0);
  const negative = balances.find((entry) => entry.balance < 0);
  const primaryTransfer =
    positive && negative
      ? {
          from: negative.person,
          to: positive.person,
          amount: Math.min(Math.abs(negative.balance), positive.balance),
          amountDisplay: formatCurrency(Math.min(Math.abs(negative.balance), positive.balance)),
        }
      : null;

  const explanation = primaryTransfer
    ? `The household split is 50/50 for shared expenses. ${primaryTransfer.from} should transfer ${primaryTransfer.amountDisplay} to ${primaryTransfer.to}.`
    : "Shared spending is already balanced for the selected month.";

  return {
    monthKey,
    monthLabel: monthLabel(monthKey),
    balances,
    primaryTransfer,
    explanation,
  };
}

export function computeDashboardSummary(
  expenses: ExpenseRow[],
  categories: CategoryRow[],
  fixedExpenses: FixedExpenseRow[],
  offsetContributions: OffsetContributionRow[]
): DashboardSummary {
  const monthKey = [...expenses].sort((a, b) => b.date.localeCompare(a.date))[0]?.monthKey ?? "2026-08";
  const monthExpenses = expenses.filter((expense) => expense.monthKey === monthKey);
  const sharedExpenses = monthExpenses.filter((expense) => expense.splitMode === "shared");
  const sharedSpent = sharedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const offsetTotal = offsetContributions.reduce((sum, item) => sum + item.amount, 0);
  const fixedMonthly = fixedExpenses.reduce((sum, item) => sum + monthlyEquivalent(item.amount, item.frequency), 0);
  const settlement = calculateSettlement(expenses, monthKey);

  const categorySeries = categories
    .map((category) => ({
      label: category.name,
      amount: sharedExpenses
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + expense.amount, 0),
      color: category.color,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const months = Array.from(
    new Set(expenses.map((expense) => expense.monthKey))
  ).sort((a, b) => a.localeCompare(b));

  const history: MonthlyHistoryRow[] = months.map((key) => {
    const monthRows = expenses.filter((expense) => expense.monthKey === key && expense.splitMode === "shared");
    const shared = monthRows.reduce((sum, expense) => sum + expense.amount, 0);
    const monthSettlement = calculateSettlement(expenses, key);
    return {
      monthKey: key,
      monthLabel: monthLabel(key),
      sharedSpentDisplay: formatCurrency(shared),
      settlementDisplay: monthSettlement.primaryTransfer
        ? `${monthSettlement.primaryTransfer.from} owes ${monthSettlement.primaryTransfer.to} ${monthSettlement.primaryTransfer.amountDisplay}`
        : "Balanced",
      sharedExpenseCount: monthRows.length,
    };
  });

  return {
    monthKey,
    monthLabel: monthLabel(monthKey),
    sharedSpent,
    sharedSpentDisplay: formatCurrency(sharedSpent),
    sharedExpenseCount: sharedExpenses.length,
    fixedMonthly,
    fixedMonthlyDisplay: formatCurrency(fixedMonthly),
    offsetTotal,
    offsetTotalDisplay: formatCurrency(offsetTotal),
    offsetCount: offsetContributions.length,
    settlement,
    settlementDisplay: settlement.primaryTransfer
      ? `${settlement.primaryTransfer.from} owes ${settlement.primaryTransfer.to} ${settlement.primaryTransfer.amountDisplay}`
      : "Balanced",
    settlementDetail: settlement.explanation,
    categorySeries,
    history,
  };
}

export function toMonthKey(date: string) {
  return monthKeyFromDate(date);
}

export function currentMonthKey() {
  return format(new Date(), "yyyy-MM");
}
