import { ContributionsView } from "@/components/contributions-view";
import { getHouseholdSnapshot } from "@/lib/household-store";

export default async function ContributionsPage() {
  const { offsetContributions } = await getHouseholdSnapshot();
  return <ContributionsView contributions={offsetContributions} />;
}
