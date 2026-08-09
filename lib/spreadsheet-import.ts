import * as XLSX from "xlsx";
import type { FixedExpenseRow, PaidBy, SplitMode } from "@/lib/finance";

export type ImportedCategoryRow = {
  name: string;
  color: string;
};

export type ImportedExpenseRow = {
  date: string;
  description: string;
  category: string;
  amount: number;
  paidBy: PaidBy;
  splitMode: SplitMode;
  notes: string;
};

export type ImportedFixedExpenseRow = {
  name: string;
  amount: number;
  frequency: FixedExpenseRow["frequency"];
  paidBy: FixedExpenseRow["paidBy"];
};

export type ImportedOffsetContributionRow = {
  date: string;
  person: PaidBy;
  description: string;
  amount: number;
};

export type ImportedWorkbook = {
  categories: ImportedCategoryRow[];
  expenses: ImportedExpenseRow[];
  fixedExpenses: ImportedFixedExpenseRow[];
  offsetContributions: ImportedOffsetContributionRow[];
};

const palette = ["#0f766e", "#2563eb", "#7c3aed", "#f59e0b", "#ef4444", "#10b981", "#0ea5e9", "#8b5cf6"];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function cellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

function asNumber(value: unknown) {
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function asPaidBy(value: unknown): PaidBy {
  const normalized = cellValue(value).toLowerCase();
  return normalized.includes("fern") ? "Fernanda" : "Harrison";
}

function asSplitMode(value: unknown): SplitMode {
  const normalized = cellValue(value).toLowerCase();
  return normalized.includes("person") ? "personal" : "shared";
}

function asFrequency(value: unknown): ImportedFixedExpenseRow["frequency"] {
  const normalized = cellValue(value).toLowerCase();
  if (normalized.startsWith("q")) return "quarterly";
  if (normalized.startsWith("y")) return "yearly";
  return "monthly";
}

function rowsFromSheet(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [] as Array<Record<string, unknown>>;
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rawRows.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[normalize(key)] = value;
    }
    return mapped;
  });
}

function pickSheet(workbook: XLSX.WorkBook, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalize);
  const name = workbook.SheetNames.find((sheetName) => normalizedCandidates.includes(normalize(sheetName)));
  return name ?? workbook.SheetNames[0];
}

function inferCategories(expenses: ImportedExpenseRow[]) {
  const categories = new Map<string, ImportedCategoryRow>();
  for (let index = 0; index < expenses.length; index += 1) {
    const name = expenses[index].category.trim();
    if (!name) continue;
    if (!categories.has(name.toLowerCase())) {
      categories.set(name.toLowerCase(), {
        name,
        color: palette[categories.size % palette.length],
      });
    }
  }
  return [...categories.values()];
}

function parseExpenses(workbook: XLSX.WorkBook): ImportedExpenseRow[] {
  const sheetName = pickSheet(workbook, ["expenses", "transactions", "ledger"]);
  const rows = rowsFromSheet(workbook, sheetName);
  return rows
    .map((row) => ({
      date: cellValue(row.date || row.transactiondate || row.posteddate || row.day || row.when),
      description: cellValue(row.description || row.memo || row.detail || row.title || row.name),
      category: cellValue(row.category || row.categoryname || row.bucket || row.type || row.group),
      amount: asNumber(row.amount || row.value || row.debit || row.cost),
      paidBy: asPaidBy(row.paidby || row.payer || row.person || row.paid),
      splitMode: asSplitMode(row.splitmode || row.split || row.shared),
      notes: cellValue(row.notes || row.note || row.comment),
    }))
    .filter((row) => row.date && row.description && row.amount > 0);
}

function parseCategories(workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames.find((name) => normalize(name) === normalize("categories"));
  if (!sheetName) return [] as ImportedCategoryRow[];
  const rows = rowsFromSheet(workbook, sheetName);
  return rows
    .map((row, index) => ({
      name: cellValue(row.name || row.category || row.title || row.label),
      color: cellValue(row.color || row.colour) || palette[index % palette.length],
    }))
    .filter((row) => row.name.length > 0);
}

function parseFixedExpenses(workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames.find((name) => normalize(name) === normalize("fixed expenses"));
  if (!sheetName) return [] as ImportedFixedExpenseRow[];
  const rows = rowsFromSheet(workbook, sheetName);
  return rows
    .map((row) => ({
      name: cellValue(row.name || row.expense || row.description),
      amount: asNumber(row.amount || row.value || row.cost),
      frequency: asFrequency(row.frequency || row.interval || row.recurring),
      paidBy: (cellValue(row.paidby || row.payer || row.owner).toLowerCase().includes("joint")
        ? "Joint"
        : asPaidBy(row.paidby || row.payer || row.owner)) as ImportedFixedExpenseRow["paidBy"],
    }))
    .filter((row) => row.name.length > 0 && row.amount > 0);
}

function parseOffsetContributions(workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames.find((name) => normalize(name) === normalize("offset contributions"));
  if (!sheetName) return [] as ImportedOffsetContributionRow[];
  const rows = rowsFromSheet(workbook, sheetName);
  return rows
    .map((row) => ({
      date: cellValue(row.date || row.when || row.created),
      person: asPaidBy(row.person || row.paidby || row.owner),
      description: cellValue(row.description || row.detail || row.memo || row.notes),
      amount: asNumber(row.amount || row.value || row.deposit),
    }))
    .filter((row) => row.date && row.description && row.amount > 0);
}

export function parseHouseholdWorkbook(buffer: Buffer): ImportedWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const expenses = parseExpenses(workbook);
  const categories = parseCategories(workbook);
  const fixedExpenses = parseFixedExpenses(workbook);
  const offsetContributions = parseOffsetContributions(workbook);

  return {
    categories: categories.length ? categories : inferCategories(expenses),
    expenses,
    fixedExpenses,
    offsetContributions,
  };
}
