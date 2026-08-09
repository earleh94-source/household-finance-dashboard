import { DashboardView } from "@/components/dashboard-view";
import { getHouseholdSnapshot } from "@/lib/household-store";

export default async function Page() {
  const { expenses, categories, fixedExpenses, offsetContributions, months } = await getHouseholdSnapshot();
  return (
    <DashboardView
      expenses={expenses}
      categories={categories}
      fixedExpenses={fixedExpenses}
      offsetContributions={offsetContributions}
      months={months}
    />
  );
}
