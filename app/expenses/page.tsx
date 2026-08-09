import { MonthlyExpenseView } from "@/components/monthly-expense-view";
import { getHouseholdSnapshot } from "@/lib/household-store";

export default async function ExpensesPage() {
  const { expenses, categories, months } = await getHouseholdSnapshot();
  return <MonthlyExpenseView initialExpenses={expenses} initialCategories={categories} initialMonths={months} />;
}
