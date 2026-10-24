-- 密码重置令牌
--
-- 用途：忘了密码时，在服务器上跑 `node dist/reset.js <邮箱>` 生成一次性链接，
-- 浏览器打开链接设新密码。适合「没有邮件服务、服务器只有自己用」的场景。
--
-- 安全约束：
-- - 只存 sha256(token)，不存原始值 —— 库被读走也不能直接用来改密码
-- - 一次性：用过即删
-- - 会过期：默认 15 分钟
-- - 生成新令牌时作废该用户所有旧令牌，避免多条链接同时有效

CREATE TABLE password_resets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX password_resets_token_hash_key ON password_resets (token_hash);
CREATE INDEX password_resets_user_idx ON password_resets (user_id);
