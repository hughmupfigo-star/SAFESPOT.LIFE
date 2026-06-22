-- D1 schema for youth story submissions.
-- Apply with:  wrangler d1 execute safe-stories --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS stories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  location      TEXT,
  age           INTEGER,
  story_title   TEXT,
  category      TEXT,
  story_content TEXT NOT NULL,
  anonymity     TEXT,
  file_key      TEXT,
  ip_hash       TEXT,
  user_agent    TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stories_created  ON stories(created_at);
CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(category);
