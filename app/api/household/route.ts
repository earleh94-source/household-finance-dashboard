import { NextRequest, NextResponse } from "next/server";
import {
  deleteCategory,
  deleteExpense,
  deleteFixedExpense,
  deleteOffsetContribution,
  getHouseholdSnapshot,
  saveCategory,
  saveExpense,
  saveFixedExpense,
  saveMonth,
  saveOffsetContribution,
} from "@/lib/household-store";
import { parseHouseholdWorkbook } from "@/lib/spreadsheet-import";
import type { CategoryRow, ExpenseRow, FixedExpenseRow, OffsetContributionRow } from "@/lib/finance";
import type { MonthInput } from "@/lib/household-store";

type ActionBody =
  | { action: "saveExpense"; payload: Omit<ExpenseRow, "id" | "monthKey"> & { id?: string } }
  | { action: "deleteExpense"; id: string }
  | { action: "saveCategory"; payload: Omit<CategoryRow, "id"> & { id?: string } }
  | { action: "deleteCategory"; id: string }
  | { action: "saveFixedExpense"; payload: Omit<FixedExpenseRow, "id"> & { id?: string } }
  | { action: "deleteFixedExpense"; id: string }
  | { action: "saveOffsetContribution"; payload: Omit<OffsetContributionRow, "id"> & { id?: string } }
  | { action: "deleteOffsetContribution"; id: string }
  | { action: "saveMonth"; payload: MonthInput };

async function getSnapshotResponse() {
  const snapshot = await getHouseholdSnapshot();
  return NextResponse.json({ snapshot });
}

export async function GET() {
  return getSnapshotResponse();
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A spreadsheet file is required." }, { status: 400 });
    }

    const imported = parseHouseholdWorkbook(Buffer.from(await file.arrayBuffer()));
    let snapshot = await getHouseholdSnapshot();

    for (const category of imported.categories) {
      snapshot = await saveCategory(category);
    }

    const categoryLookup = new Map(snapshot.categories.map((category) => [category.name.trim().toLowerCase(), category.id]));

    for (const expense of imported.expenses) {
      const categoryId =
        categoryLookup.get(expense.category.trim().toLowerCase()) ??
        snapshot.categories[0]?.id ??
        categoryLookup.values().next().value;

      if (!categoryId) continue;

      snapshot = await saveExpense({
        ...expense,
        categoryId,
      });
    }

    for (const fixedExpense of imported.fixedExpenses) {
      snapshot = await saveFixedExpense(fixedExpense);
    }

    for (const contribution of imported.offsetContributions) {
      snapshot = await saveOffsetContribution(contribution);
    }

    return NextResponse.json({ snapshot });
  }

  const body = (await request.json()) as ActionBody;

  switch (body.action) {
    case "saveExpense":
      return NextResponse.json({
        snapshot: await saveExpense(body.payload),
      });
    case "deleteExpense":
      return NextResponse.json({
        snapshot: await deleteExpense(body.id),
      });
    case "saveCategory":
      return NextResponse.json({
        snapshot: await saveCategory(body.payload),
      });
    case "deleteCategory":
      return NextResponse.json({
        snapshot: await deleteCategory(body.id),
      });
    case "saveFixedExpense":
      return NextResponse.json({
        snapshot: await saveFixedExpense(body.payload),
      });
    case "deleteFixedExpense":
      return NextResponse.json({
        snapshot: await deleteFixedExpense(body.id),
      });
    case "saveOffsetContribution":
      return NextResponse.json({
        snapshot: await saveOffsetContribution(body.payload),
      });
    case "deleteOffsetContribution":
      return NextResponse.json({
        snapshot: await deleteOffsetContribution(body.id),
      });
    case "saveMonth":
      return NextResponse.json({
        snapshot: await saveMonth(body.payload),
      });
    default:
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
}
