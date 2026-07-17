-- Run against local D1:
--   npx wrangler d1 execute chrismanlove-db --local --file=schema.sql
--
-- Run against production D1:
--   npx wrangler d1 execute chrismanlove-db --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  google_sub   TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  picture      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  post_slug  TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  TEXT REFERENCES comments(id),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_slug   ON comments(post_slug);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
