CREATE TABLE IF NOT EXISTS torment_views (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES torment_posts ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE torment_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own view
DROP POLICY IF EXISTS "Users can insert own view" ON torment_views;
CREATE POLICY "Users can insert own view" ON torment_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can read all views
DROP POLICY IF EXISTS "Users can read all views" ON torment_views;
CREATE POLICY "Users can read all views" ON torment_views FOR SELECT USING (true);
