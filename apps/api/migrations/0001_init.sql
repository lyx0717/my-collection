-- 个人自用，只保留必需的表与索引。
-- 多用户隔离靠每条 SQL 的 WHERE user_id = $1，不用 RLS。

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL,          -- sha256(token)，不存原始 token
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sessions_token_hash_key ON sessions (token_hash);

CREATE TABLE collections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  icon       text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX collections_user_name_key ON collections (user_id, lower(btrim(name)));

CREATE TABLE bookmarks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  url           text NOT NULL,
  title         text NOT NULL,
  description   text,
  domain        text NOT NULL,
  favicon_url   text,
  cover         text,
  sort_order    integer NOT NULL DEFAULT 0,
  dedupe_key    text NOT NULL,        -- normalizeUrl(url)，前后端同一实现
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- 同一用户同一链接只能有一条，去重由数据库强制
CREATE UNIQUE INDEX bookmarks_user_dedupe_key ON bookmarks (user_id, dedupe_key);
CREATE INDEX bookmarks_user_order_idx ON bookmarks (user_id, sort_order);
