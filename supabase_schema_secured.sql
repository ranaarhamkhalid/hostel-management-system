-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Rooms
create table if not exists rooms (
  id text primary key,
  number text not null,
  type text not null,
  -- rent numeric not null, -- Deprecated, moving to seats
  created_at timestamptz default now()
);

-- 2. Residents
create table if not exists residents (
  id text primary key,
  name text not null,
  father_name text, -- Added
  cnic text,
  phone text,
  g_phone text,
  move_in date,
  move_out date,
  status text default 'Active',
  deposit numeric default 0,
  created_at timestamptz default now()
);

-- 3. Seats (Links Room <-> Resident)
create table if not exists seats (
  id uuid default uuid_generate_v4() primary key,
  room_id text references rooms(id) on delete cascade,
  seat_number integer not null,
  rent numeric default 0, -- Added
  resident_id text references residents(id) on delete set null,
  unique(room_id, seat_number)
);

-- 4. Mess Attendance
create table if not exists mess_attendance (
  id uuid default uuid_generate_v4() primary key,
  resident_id text references residents(id) on delete cascade,
  date date not null,
  breakfast boolean default false,
  lunch boolean default false,
  dinner boolean default false,
  breakfast_cost numeric default 0, -- Added
  lunch_cost numeric default 0,     -- Added
  dinner_cost numeric default 0,    -- Added
  unique(resident_id, date)
);

-- 5. Custom Charges
create table if not exists custom_charges (
  id text primary key,
  resident_id text references residents(id) on delete cascade,
  date date not null,
  type text not null,
  amount numeric not null,
  notes text,
  created_at timestamptz default now()
);

-- 6. Invoices
create table if not exists invoices (
  id text primary key,
  resident_id text references residents(id) on delete cascade,
  month text not null, -- Format: YYYY-MM
  room_rent numeric default 0,
  mess_total numeric default 0,
  custom_total numeric default 0,
  prev_dues numeric default 0,
  total_due numeric default 0,
  amount_paid numeric default 0,
  status text default 'Unpaid',
  created_at timestamptz default now()
);

-- 7. Payments
create table if not exists payments (
  id text primary key,
  resident_id text references residents(id) on delete cascade,
  invoice_id text references invoices(id) on delete set null,
  amount numeric not null,
  date date not null,
  method text,
  notes text,
  created_at timestamptz default now()
);

-- 8. Settings (Key-Value Store for prices, etc.)
create table if not exists settings (
  key text primary key,
  value jsonb not null
);

-- 9. Audit Log
create table if not exists audit_log (
  id text primary key,
  action text not null,
  details text,
  created_at timestamptz default now()
);

-- 10. Expenses
create table if not exists expenses (
  id text primary key,
  title text not null,
  category text not null,
  amount numeric not null,
  date date not null,
  notes text,
  created_at timestamptz default now()
);

-- 11. Resident History (New)
create table if not exists resident_history (
  id text primary key,
  resident_id text references residents(id) on delete cascade,
  room_number text,
  seat_number integer,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- Initial Data: Meal Prices
insert into settings (key, value) values 
('meal_prices', '{"breakfast": 100, "lunch": 200, "dinner": 200}')
on conflict (key) do nothing;

-- RLS Policies (AUTHENTICATED ACCESS ONLY)
alter table expenses enable row level security;
create policy "Auth access" on expenses for all using (auth.role() = 'authenticated');

alter table rooms enable row level security;
create policy "Auth access" on rooms for all using (auth.role() = 'authenticated');

alter table residents enable row level security;
create policy "Auth access" on residents for all using (auth.role() = 'authenticated');

alter table seats enable row level security;
create policy "Auth access" on seats for all using (auth.role() = 'authenticated');

alter table mess_attendance enable row level security;
create policy "Auth access" on mess_attendance for all using (auth.role() = 'authenticated');

alter table custom_charges enable row level security;
create policy "Auth access" on custom_charges for all using (auth.role() = 'authenticated');

alter table invoices enable row level security;
create policy "Auth access" on invoices for all using (auth.role() = 'authenticated');

alter table payments enable row level security;
create policy "Auth access" on payments for all using (auth.role() = 'authenticated');

alter table settings enable row level security;
create policy "Auth access" on settings for all using (auth.role() = 'authenticated');

alter table audit_log enable row level security;
create policy "Auth access" on audit_log for all using (auth.role() = 'authenticated');

alter table resident_history enable row level security;
create policy "Auth access" on resident_history for all using (auth.role() = 'authenticated');
