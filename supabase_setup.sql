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

-- Personal Journal Tables
CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  entry_date DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- Enable RLS for journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policies for journal_entries (private to user)
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own journal entries" ON journal_entries;
CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own journal entries" ON journal_entries;
CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Torment Social Feed Tables
CREATE TABLE IF NOT EXISTS torment_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  screenshot_url TEXT,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torment_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES torment_posts ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS torment_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES torment_posts ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for torment tables
ALTER TABLE torment_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE torment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE torment_comments ENABLE ROW LEVEL SECURITY;

-- Policies for torment_posts (public read, authenticated write)
DROP POLICY IF EXISTS "Anyone can view posts" ON torment_posts;
CREATE POLICY "Anyone can view posts"
  ON torment_posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON torment_posts;
CREATE POLICY "Authenticated users can create posts"
  ON torment_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON torment_posts;
CREATE POLICY "Users can update own posts"
  ON torment_posts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON torment_posts;
CREATE POLICY "Users can delete own posts"
  ON torment_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for torment_likes
DROP POLICY IF EXISTS "Anyone can view likes" ON torment_likes;
CREATE POLICY "Anyone can view likes"
  ON torment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can like" ON torment_likes;
CREATE POLICY "Authenticated users can like"
  ON torment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike" ON torment_likes;
CREATE POLICY "Users can unlike"
  ON torment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for torment_comments
DROP POLICY IF EXISTS "Anyone can view comments" ON torment_comments;
CREATE POLICY "Anyone can view comments"
  ON torment_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON torment_comments;
CREATE POLICY "Authenticated users can comment"
  ON torment_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON torment_comments;
CREATE POLICY "Users can delete own comments"
  ON torment_comments FOR DELETE
  USING (auth.uid() = user_id);
