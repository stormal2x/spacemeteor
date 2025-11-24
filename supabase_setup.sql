-- Create the storage bucket for screenshots if it doesn't exist
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', true)
on conflict (id) do nothing;

-- Set up security policies (Drop first to avoid duplicates)

drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'trade-screenshots' );

drop policy if exists "Authenticated Uploads" on storage.objects;
create policy "Authenticated Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'trade-screenshots' );

drop policy if exists "User Update" on storage.objects;
create policy "User Update"
  on storage.objects for update
  using ( bucket_id = 'trade-screenshots' );

drop policy if exists "User Delete" on storage.objects;
create policy "User Delete"
  on storage.objects for delete
  using ( bucket_id = 'trade-screenshots' );

-- Add the screenshot_url column to the trades table
alter table trades add column if not exists screenshot_url text;

-- Add the pnl column to the trades table
alter table trades add column if not exists pnl numeric;
