# 生产部署（腾讯云轻量服务器）

## 拓扑

```
互联网 → 云防火墙 → mybook-web(nginx, 8080:80) → mybook-api(3000, 内网) → mybook-db(5432, 内网)
                                              └→ mybook-migrate（一次性，跑完退出）
```

- **无域名**：纯 http + IP 访问，`COOKIE_SECURE=false`（Secure cookie 在 http 下不保存，登录会静默失败）
- **与 my-video 隔离**：compose 项目名 `mybook`、容器前缀 `mybook-`、独立网络与卷、web 独占 8080（my-video 用宿主机 nginx 占 80）
- **数据库不对外**：5432 无端口映射，只在 compose 内网可达

## 服务器前置条件（已就绪）

- Ubuntu 22.04、2核2G、50G SSD
- Docker 29 + Compose 2.40 + 腾讯云镜像加速（`mirror.ccs.tencentyun.com`）
- 2G swap、TZ=Asia/Shanghai
- 云防火墙放行 **22 / 8080**（80 被 my-video 占用；443 未启用，无域名不签证书）

## 部署

```bash
./deploy/deploy.sh            # rsync 代码 → 构建 → 启动 → 冒烟测试
```

首次运行会在服务器 `/opt/apps/mybook/deploy/.env` 生成强随机 `DB_PASSWORD`（只此一次，
后续部署保留）。`.env` 与 `node_modules` / `dist` 都不同步，代码更新不影响数据。

## 日常运维

```bash
ssh ubuntu@62.234.25.162

cd /opt/apps/mybook/deploy
docker compose ps                    # 状态
docker compose logs -f api           # 看日志
docker compose up -d                 # 重建后启动
docker compose restart api           # 单服务重启

# 数据库
docker compose exec db psql -U mybook -d mybook
docker compose exec db pg_dump -U mybook -Fc mybook > backup.dump   # 备份
```

## 数据备份（待办：接定时任务）

```bash
# pg_dump -Fc 保留 14 天 + 上传 COS；另在控制台开轻量服务器自动快照（7 天）
# 恢复演练：pg_restore -c -d mybook -U mybook backup.dump
```

## 后续升级路径

1. **有域名后**：控制台加防火墙 443 → 宿主机 nginx 加 server 块（按 Host 区分 my-video / mybook）
   → 签腾讯云免费 DV 证书 → `COOKIE_SECURE=true` + `__Host-` cookie 前缀
2. **CI/CD**：GitHub Actions 构建镜像 → 推送腾讯云 TCR → 服务器 `compose pull && up -d`
3. **备案**：若上大陆域名，先 ICP 备案（1–3 周）再用 80/443；香港地域则免
