import { mockCategories, mockExpenses, mockFixedExpenses, mockOffsetContributions } from "@/lib/mock-data";
import {
  calculateSettlement,
  currentMonthKey,
  toMonthKey,
  type CategoryRow,
  type ExpenseRow,
  type FixedExpenseRow,
  type MonthState,
  type OffsetContributionRow,
  type PaidBy,
  type SplitMode,
} from "@/lib/finance";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type HouseholdSnapshot = {
  categories: CategoryRow[];
  expenses: ExpenseRow[];
  fixedExpenses: FixedExpenseRow[];
  offsetContributions: OffsetContributionRow[];
  months: MonthState[];
};

export type MonthInput = {
  monthKey: string;
  settled: boolean;
};

export type ExpenseInput = {
  id?: string;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  paidBy: PaidBy;
  splitMode: SplitMode;
  notes?: string;
};

export type CategoryInput = {
  id?: string;
  name: string;
  color: string;
};

export type FixedExpenseInput = {
  id?: string;
  name: string;
  amount: number;
  frequency: FixedExpenseRow["frequency"];
  paidBy: FixedExpenseRow["paidBy"];
};

export type OffsetContributionInput = {
  id?: string;
  date: string;
  person: PaidBy;
  description: string;
  amount: number;
};

type DbExpenseRow = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number | string;
  paid_by: PaidBy;
  split_ratio: number;
};

type DbFixedExpenseRow = {
  id: string;
  name: string;
  amount: number | string;
  category: string;
  frequency: FixedExpenseRow["frequency"];
  paid_by: FixedExpenseRow["paidBy"] | null;
};

type DbOffsetContributionRow = {
  id: string;
  date: string;
  person: PaidBy;
  description: string;
  amount: number | string;
};

type DbMonthRow = {
  month: string;
  settled: boolean;
};

const CATEGORY_COLORS = [
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#dc2626",
  "#2563eb",
  "#059669",
  "#db2777",
  "#ca8a04",
  "#4f46e5",
  "#e11d48",
  "#0891b2",
  "#65a30d",
];

let memoryStore: HouseholdSnapshot = {
  categories: [...mockCategories],
  expenses: [...mockExpenses],
  fixedExpenses: [...mockFixedExpenses],
  offsetContributions: [...mockOffsetContributions],
  months: [],
};

function cloneSnapshot(snapshot: HouseholdSnapshot): HouseholdSnapshot {
  return {
    categories: snapshot.categories.map((item) => ({ ...item })),
    expenses: snapshot.expenses.map((item) => ({ ...item })),
    fixedExpenses: snapshot.fixedExpenses.map((item) => ({ ...item })),
    offsetContributions: snapshot.offsetContributions.map((item) => ({ ...item })),
    months: snapshot.months.map((item) => ({ ...item })),
  };
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function categoryIdFor(name: string) {
  return (name || "Uncategorized").trim();
}

function buildCategoriesFromExpenses(rows: { category: string }[]): CategoryRow[] {
  const seen = new Set<string>();
  const categories: CategoryRow[] = [];
  for (const row of rows) {
    const name = (row.category ?? "").trim() || "Uncategorized";
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    categories.push({
      id: categoryIdFor(name),
      name,
      color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
    });
  }
  return categories;
}

function toExpenseRow(row: DbExpenseRow): ExpenseRow {
  return {
    id: row.id,
    date: row.date,
    monthKey: toMonthKey(row.date),
    description: row.description,
    categoryId: categoryIdFor(row.category),
    amount: Number(row.amount),
    paidBy: row.paid_by,
    splitMode: row.split_ratio >= 50 ? "shared" : "personal",
    notes: "",
  };
}

function toCategoryRow(row: CategoryRow): CategoryRow {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

function toFixedExpenseRow(row: DbFixedExpenseRow): FixedExpenseRow {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    frequency: row.frequency,
    paidBy: row.paid_by ?? "Joint",
  };
}

function toOffsetContributionRow(row: DbOffsetContributionRow): OffsetContributionRow {
  return {
    id: row.id,
    date: row.date,
    person: row.person,
    description: row.description,
    amount: Number(row.amount),
  };
}

function toMonthRow(row: DbMonthRow): MonthState {
  return {
    monthKey: toMonthKey(row.month),
    settled: row.settled,
  };
}

async function readRemoteSnapshot(): Promise<HouseholdSnapshot | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const [expensesRes, fixedExpensesRes, contributionsRes, monthsRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("id,date,description,category,amount,paid_by,split_ratio,is_fixed")
      .order("date", { ascending: false }),
    supabase
      .from("fixed_expenses")
      .select("id,name,amount,category,frequency,active,paid_by")
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("contributions")
      .select("id,date,person,amount,description")
      .order("date", { ascending: false }),
    supabase.from("months").select("month,settled").order("month", { ascending: false }),
  ]);

  if (expensesRes.error || fixedExpensesRes.error || contributionsRes.error || monthsRes.error) {
    const message =
      expensesRes.error?.message ??
      fixedExpensesRes.error?.message ??
      contributionsRes.error?.message ??
      monthsRes.error?.message ??
      "Unknown Supabase error";
    throw new Error(message);
  }

  const expenseRows = (expensesRes.data ?? []) as unknown as DbExpenseRow[];
  const categories = buildCategoriesFromExpenses(expenseRows);

  const snapshot: HouseholdSnapshot = {
    categories,
    expenses: expenseRows.map(toExpenseRow),
    fixedExpenses: ((fixedExpensesRes.data ?? []) as unknown as DbFixedExpenseRow[]).map(toFixedExpenseRow),
    offsetContributions: ((contributionsRes.data ?? []) as unknown as DbOffsetContributionRow[]).map(
      toOffsetContributionRow
    ),
    months: ((monthsRes.data ?? []) as unknown as DbMonthRow[]).map(toMonthRow),
  };

  if (
    snapshot.categories.length === 0 &&
    snapshot.expenses.length === 0 &&
    snapshot.fixedExpenses.length === 0 &&
    snapshot.offsetContributions.length === 0 &&
    snapshot.months.length === 0
  ) {
    return null;
  }

  return snapshot;
}

function findCategoryIdByName(snapshot: HouseholdSnapshot, name: string) {
  const normalized = name.trim().toLowerCase();
  return snapshot.categories.find((category) => category.name.trim().toLowerCase() === normalized)?.id;
}

function addExpenseToSnapshot(snapshot: HouseholdSnapshot, input: ExpenseInput) {
  const expense: ExpenseRow = {
    id: input.id ?? generateId("exp"),
    date: input.date,
    monthKey: toMonthKey(input.date),
    description: input.description.trim(),
    categoryId: input.categoryId,
    amount: input.amount,
    paidBy: input.paidBy,
    splitMode: input.splitMode,
    notes: input.notes?.trim() ?? "",
  };

  const index = snapshot.expenses.findIndex((row) => row.id === expense.id);
  if (index >= 0) snapshot.expenses[index] = expense;
  else snapshot.expenses.unshift(expense);
}

function addCategoryToSnapshot(snapshot: HouseholdSnapshot, input: CategoryInput) {
  const category: CategoryRow = {
    id: input.id ?? categoryIdFor(input.name),
    name: input.name.trim(),
    color: input.color || "#0f766e",
  };

  const index = snapshot.categories.findIndex((row) => row.id === category.id);
  if (index >= 0) snapshot.categories[index] = category;
  else snapshot.categories.unshift(category);
  return category;
}

function addFixedExpenseToSnapshot(snapshot: HouseholdSnapshot, input: FixedExpenseInput) {
  const fixedExpense: FixedExpenseRow = {
    id: input.id ?? generateId("fix"),
    name: input.name.trim(),
    amount: input.amount,
    frequency: input.frequency,
    paidBy: input.paidBy,
  };

  const index = snapshot.fixedExpenses.findIndex((row) => row.id === fixedExpense.id);
  if (index >= 0) snapshot.fixedExpenses[index] = fixedExpense;
  else snapshot.fixedExpenses.unshift(fixedExpense);
}

function addOffsetContributionToSnapshot(snapshot: HouseholdSnapshot, input: OffsetContributionInput) {
  const contribution: OffsetContributionRow = {
    id: input.id ?? generateId("off"),
    date: input.date,
    person: input.person,
    description: input.description.trim(),
    amount: input.amount,
  };

  const index = snapshot.offsetContributions.findIndex((row) => row.id === contribution.id);
  if (index >= 0) snapshot.offsetContributions[index] = contribution;
  else snapshot.offsetContributions.unshift(contribution);
}

export async function getHouseholdSnapshot(): Promise<HouseholdSnapshot> {
  const remote = await readRemoteSnapshot();
  return remote ? cloneSnapshot(remote) : cloneSnapshot(memoryStore);
}

export async function saveExpense(input: ExpenseInput) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    addExpenseToSnapshot(memoryStore, input);
    return cloneSnapshot(memoryStore);
  }

  const { error } = await supabase.from("expenses").upsert(
    {
      id: input.id ?? generateId("exp"),
      month: `${toMonthKey(input.date)}-01`,
      date: input.date,
      description: input.description.trim(),
      category: input.categoryId,
      amount: input.amount,
      paid_by: input.paidBy,
      split_ratio: input.splitMode === "shared" ? 50 : 0,
      is_fixed: false,
      source_fixed_expense_id: null,
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
  return getHouseholdSnapshot();
}

export async function deleteExpense(id: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    memoryStore.expenses = memoryStore.expenses.filter((expense) => expense.id !== id);
    return cloneSnapshot(memoryStore);
  }

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return getHouseholdSnapshot();
}

export async function saveCategory(input: CategoryInput) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    addCategoryToSnapshot(memoryStore, input);
    return cloneSnapshot(memoryStore);
  }

  addCategoryToSnapshot(memoryStore, input);
  return getHouseholdSnapshot();
}

export async function deleteCategory(id: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    memoryStore.categories = memoryStore.categories.filter((category) => category.id !== id);
    memoryStore.expenses = memoryStore.expenses.filter((expense) => expense.categoryId !== id);
    return cloneSnapshot(memoryStore);
  }

  return getHouseholdSnapshot();
}

export async function saveFixedExpense(input: FixedExpenseInput) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    addFixedExpenseToSnapshot(memoryStore, input);
    return cloneSnapshot(memoryStore);
  }

  let category = "Other";
  if (input.id) {
    const { data } = await supabase.from("fixed_expenses").select("category").eq("id", input.id).maybeSingle();
    category = data?.category ?? "Other";
  }

  const { error } = await supabase.from("fixed_expenses").upsert(
    {
      id: input.id ?? generateId("fix"),
      name: input.name.trim(),
      amount: input.amount,
      category,
      frequency: input.frequency,
      paid_by: input.paidBy,
      active: true,
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
  return getHouseholdSnapshot();
}

export async function deleteFixedExpense(id: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    memoryStore.fixedExpenses = memoryStore.fixedExpenses.filter((row) => row.id !== id);
    return cloneSnapshot(memoryStore);
  }

  const { error } = await supabase.from("fixed_expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return getHouseholdSnapshot();
}

export async function saveOffsetContribution(input: OffsetContributionInput) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    addOffsetContributionToSnapshot(memoryStore, input);
    return cloneSnapshot(memoryStore);
  }

  const { error } = await supabase.from("contributions").upsert(
    {
      id: input.id ?? generateId("off"),
      date: input.date,
      person: input.person,
      description: input.description.trim(),
      amount: input.amount,
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
  return getHouseholdSnapshot();
}

export async function deleteOffsetContribution(id: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    memoryStore.offsetContributions = memoryStore.offsetContributions.filter((row) => row.id !== id);
    return cloneSnapshot(memoryStore);
  }

  const { error } = await supabase.from("contributions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return getHouseholdSnapshot();
}

export async function saveMonth(input: MonthInput) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    const index = memoryStore.months.findIndex((month) => month.monthKey === input.monthKey);
    if (index >= 0) memoryStore.months[index] = { ...input };
    else memoryStore.months.unshift({ ...input });
    return cloneSnapshot(memoryStore);
  }

  const { error } = await supabase.from("months").upsert(
    {
      month: `${input.monthKey}-01`,
      settled: input.settled,
    },
    { onConflict: "month" }
  );

  if (error) throw new Error(error.message);
  return getHouseholdSnapshot();
}

export function summarizeSnapshot(snapshot: HouseholdSnapshot) {
  const monthKey = snapshot.expenses[0]?.monthKey ?? currentMonthKey();
  const settlement = calculateSettlement(snapshot.expenses, monthKey);
  return { monthKey, settlement };
}

export function applyImportedSnapshot(snapshot: HouseholdSnapshot) {
  memoryStore = cloneSnapshot(snapshot);
}

export function generateCategoryNameLookup(snapshot: HouseholdSnapshot) {
  return new Map(snapshot.categories.map((category) => [category.name.trim().toLowerCase(), category.id]));
}

export function resolveCategoryId(snapshot: HouseholdSnapshot, categoryName: string) {
  return findCategoryIdByName(snapshot, categoryName);
}
