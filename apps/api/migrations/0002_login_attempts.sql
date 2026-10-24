-- 登录失败计数：暴力破解防护
--
-- 为什么存库里而不是进程内存：服务会被 systemd 重启、部署会重启进程，
-- 内存计数一重启就清零，攻击者只要等到重启窗口就能重置。存库才能跨进程生效。
--
-- 按「邮箱 + IP」两个维度分别计数：
--   * 只按邮箱：攻击者可以故意把别人账号锁死（拒绝服务）
--   * 只按 IP：攻击者换 IP 或走代理池就绕过了
--   两者结合：邮箱锁阈值高一些（防定向爆破），IP 锁阈值低一些（防扫号）

CREATE TABLE login_attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  ip         text NOT NULL,
  succeeded  boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_attempts_email_idx ON login_attempts (email, created_at DESC);
CREATE INDEX login_attempts_ip_idx ON login_attempts (ip, created_at DESC);

-- 过期记录靠登录/lockout 检查时顺带清理，不额外开定时任务
CREATE INDEX login_attempts_created_idx ON login_attempts (created_at);
