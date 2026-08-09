insert into public.categories (household_id, name, color) values
  ('demo-household', 'Groceries', '#0f766e'),
  ('demo-household', 'Utilities', '#2563eb'),
  ('demo-household', 'Dining out', '#f59e0b'),
  ('demo-household', 'Home', '#8b5cf6'),
  ('demo-household', 'Transport', '#14b8a6')
on conflict do nothing;

insert into public.fixed_expenses (household_id, name, amount, frequency, paid_by) values
  ('demo-household', 'Mortgage', 3200, 'monthly', 'Joint'),
  ('demo-household', 'Internet', 89, 'monthly', 'Harrison'),
  ('demo-household', 'Spotify', 24, 'monthly', 'Fernanda'),
  ('demo-household', 'Water rates', 480, 'quarterly', 'Joint'),
  ('demo-household', 'Council rates', 1860, 'yearly', 'Joint')
on conflict do nothing;

