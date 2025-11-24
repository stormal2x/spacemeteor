-- Create the storage bucket for screenshots
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', true);

-- Set up security policies to allow uploads and viewing

-- Allow public access to view files (so you can see them in the app)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'trade-screenshots' );

-- Allow authenticated users to upload files
create policy "Authenticated Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'trade-screenshots' );

-- Allow users to update/delete their own files (optional but good practice)
create policy "User Update"
  on storage.objects for update
  using ( bucket_id = 'trade-screenshots' );

create policy "User Delete"
  on storage.objects for delete
  using ( bucket_id = 'trade-screenshots' );
