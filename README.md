# Household Finance Dashboard

Next.js 15 + TypeScript + Tailwind + shadcn/ui-style household finance dashboard scaffold for tracking:

- Monthly settlement
- Spending by category
- Fixed expenses
- Extra offset contributions
- Expense CRUD
- Historical summaries

## What is included

- App Router structure
- Dashboard, expense manager, and history pages
- Reusable UI primitives in `components/ui`
- Calculation helpers for settlements and monthly summaries
- Supabase SQL schema and seed data
- Mock data fallback so the UI can render before a live database is wired up
- Spreadsheet import support for `.xlsx`, `.xls`, `.csv`, and `.tsv`
- A single API route at `/api/household` for CRUD and import actions

## Quick start

1. Install dependencies.
2. Create `.env.local` from `.env.example`.
3. Run the app with `npm run dev`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql`.
3. Optionally run `supabase/seed.sql`.
4. Set the public URL, publishable key, and service role key in `.env.local`.
5. If you want the browser client helper to work, set the publishable key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Notes

- `expenses` includes a `split_mode` field so the app can separate shared reconciliation from personal spending.
- `fixed_expenses` is modeled separately so recurring commitments do not pollute the settlement ledger.
- The code uses sample household members `Harrison` and `Fernanda`.
- The spreadsheet uploader expects a workbook with sheets like `Expenses`, `Categories`, `Fixed Expenses`, and `Offset Contributions`, but it also handles a single-sheet expense export with familiar column names.
