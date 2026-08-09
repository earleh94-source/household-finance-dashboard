import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";

const startingContributions = [
  {
    id: "house-deposit",
    label: "House Deposit + Lawyers",
    harrison: 174825.53,
    fernanda: 0,
  },
  {
    id: "offset-savings",
    label: "Offset Savings",
    harrison: 28517.93,
    fernanda: 37233.5,
  },
] as const;

const totalHarrison = startingContributions.reduce((sum, item) => sum + item.harrison, 0);
const totalFernanda = startingContributions.reduce((sum, item) => sum + item.fernanda, 0);
const grandTotal = totalHarrison + totalFernanda;

export function StartingHomeContributionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Starting home contributions</CardTitle>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Initial contributions toward the home, fixed at purchase time.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Contribution</th>
                <th className="py-2 pr-4 text-right font-medium">Harrison</th>
                <th className="py-2 pr-4 text-right font-medium">Fernanda</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {startingContributions.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{item.label}</td>
                  <td className="py-3 pr-4 text-right text-slate-500 dark:text-slate-400">{formatCurrency(item.harrison)}</td>
                  <td className="py-3 pr-4 text-right text-slate-500 dark:text-slate-400">{formatCurrency(item.fernanda)}</td>
                  <td className="py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(item.harrison + item.fernanda)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">Ownership totals</td>
                <td className="py-3 pr-4 text-right font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalHarrison)}</td>
                <td className="py-3 pr-4 text-right font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalFernanda)}</td>
                <td className="py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
