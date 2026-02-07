create table if not exists public.bot_debug_logs (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    instance_name text,
    step text,
    message text,
    details jsonb
);

alter table public.bot_debug_logs enable row level security;
create policy "Enable insert for authenticated users only" on public.bot_debug_logs for insert with check (true);
create policy "Enable select for authenticated users only" on public.bot_debug_logs for select using (true);
