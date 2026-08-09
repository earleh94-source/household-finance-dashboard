import { type CategoryRow, type ExpenseRow, type FixedExpenseRow, type OffsetContributionRow, toMonthKey } from "@/lib/finance";

export const mockCategories: CategoryRow[] = [
  { id: "cat-groceries", name: "Groceries", color: "#0f766e" },
  { id: "cat-utilities", name: "Utilities", color: "#2563eb" },
  { id: "cat-dining", name: "Dining out", color: "#f59e0b" },
  { id: "cat-home", name: "Home", color: "#8b5cf6" },
  { id: "cat-transport", name: "Transport", color: "#14b8a6" },
];

const sampleExpenses = [
  {
    id: "exp-1",
    date: "2026-08-01",
    description: "Weekly groceries",
    categoryId: "cat-groceries",
    amount: 218,
    paidBy: "Harrison" as const,
    splitMode: "shared" as const,
    notes: "Pantry restock",
  },
  {
    id: "exp-2",
    date: "2026-08-03",
    description: "Power bill",
    categoryId: "cat-utilities",
    amount: 142,
    paidBy: "Fernanda" as const,
    splitMode: "shared" as const,
    notes: "",
  },
  {
    id: "exp-3",
    date: "2026-08-05",
    description: "Dinner with friends",
    categoryId: "cat-dining",
    amount: 96,
    paidBy: "Harrison" as const,
    splitMode: "personal" as const,
    notes: "",
  },
  {
    id: "exp-4",
    date: "2026-08-08",
    description: "Cleaning supplies",
    categoryId: "cat-home",
    amount: 64,
    paidBy: "Fernanda" as const,
    splitMode: "shared" as const,
    notes: "",
  },
  {
    id: "exp-5",
    date: "2026-08-12",
    description: "Fuel",
    categoryId: "cat-transport",
    amount: 81,
    paidBy: "Harrison" as const,
    splitMode: "shared" as const,
    notes: "",
  },
  {
    id: "exp-6",
    date: "2026-07-18",
    description: "Groceries",
    categoryId: "cat-groceries",
    amount: 196,
    paidBy: "Fernanda" as const,
    splitMode: "shared" as const,
    notes: "",
  },
  {
    id: "exp-7",
    date: "2026-07-24",
    description: "Internet",
    categoryId: "cat-utilities",
    amount: 89,
    paidBy: "Harrison" as const,
    splitMode: "shared" as const,
    notes: "",
  },
  {
    id: "exp-8",
    date: "2026-06-30",
    description: "House repaint supplies",
    categoryId: "cat-home",
    amount: 210,
    paidBy: "Fernanda" as const,
    splitMode: "shared" as const,
    notes: "",
  },
] satisfies Array<Omit<ExpenseRow, "monthKey">>;

export const mockExpenses: ExpenseRow[] = sampleExpenses.map((expense) => ({
  ...expense,
  monthKey: toMonthKey(expense.date),
}));

export const mockFixedExpenses: FixedExpenseRow[] = [
  { id: "fix-1", name: "Mortgage", amount: 3200, frequency: "monthly", paidBy: "Joint" },
  { id: "fix-2", name: "Internet", amount: 89, frequency: "monthly", paidBy: "Harrison" },
  { id: "fix-3", name: "Spotify", amount: 24, frequency: "monthly", paidBy: "Fernanda" },
  { id: "fix-4", name: "Water rates", amount: 480, frequency: "quarterly", paidBy: "Joint" },
  { id: "fix-5", name: "Council rates", amount: 1860, frequency: "yearly", paidBy: "Joint" },
];

export const mockOffsetContributions: OffsetContributionRow[] = [
  { id: "off-1", date: "2026-01-15", person: "Harrison", description: "Bonus deposit", amount: 2000 },
  { id: "off-2", date: "2026-02-20", person: "Fernanda", description: "Tax refund", amount: 1500 },
  { id: "off-3", date: "2026-04-01", person: "Harrison", description: "Salary increase savings", amount: 1000 },
  { id: "off-4", date: "2026-07-05", person: "Fernanda", description: "Extra repayment", amount: 700 },
];

