# nginx 网关配置（仓库镜像）

服务器上真正生效的配置在 `/opt/gateway/nginx/`，这里是它的逐字节副本，
用于**服务器整机重装时恢复**，也方便在本地 `diff` 出线上到底改成什么样了。

## 文件对应关系

| 仓库 | 服务器 |
|---|---|
| `deploy/nginx/my-collection.conf` | `/opt/gateway/nginx/sites/my-collection.conf` |
| `deploy/nginx/locations/my-collection-app.conf` | `/opt/gateway/nginx/locations/my-collection-app.conf` |
| `deploy/nginx/snippets/gzip.conf` | `/opt/gateway/nginx/snippets/gzip.conf` |
| `deploy/nginx/snippets/proxy_common.conf` | `/opt/gateway/nginx/snippets/proxy_common.conf` |
| `deploy/nginx/snippets/security-headers.conf` | `/opt/gateway/nginx/snippets/security-headers.conf` |

`snippets/` 是**整机多项目共用**的，不属于本项目独有；`sites/` 下一项目一个文件。
同机还有另一个项目的 `libretv.conf`，不在本仓库里。

`locations/my-collection-app.conf` 是本项目的 location 集合（healthz、`/api/`、`/assets/`、
`/index.html`、`/.well-known/acme-challenge/`、dotfile deny），被 80（IP 回退）与 443（域名）
两个 server 块共同 `include` —— 同一套规则只维护一份，改一处两边同时生效。

`/etc/nginx/nginx.conf` 里由这两行接上（nginx 1.18.0 / Ubuntu）：

```nginx
# 多项目共用网关限流：默认桶 10r/s，站点内按需 limit_req
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# 多项目站点配置（先于默认 server 加载）
include /opt/gateway/nginx/sites/*.conf;
```

## 改了线上配置之后，同步回仓库

```bash
scp huawei-flexus:/opt/gateway/nginx/sites/my-collection.conf deploy/nginx/my-collection.conf
scp huawei-flexus:/opt/gateway/nginx/locations/my-collection-app.conf deploy/nginx/locations/my-collection-app.conf
for f in gzip proxy_common security-headers; do
  scp "huawei-flexus:/opt/gateway/nginx/snippets/$f.conf" "deploy/nginx/snippets/$f.conf"
done
git diff -- deploy/nginx/     # 确认改动就是你以为的那几行
```

## 改了仓库然后推到服务器

```bash
scp deploy/nginx/my-collection.conf huawei-flexus:/opt/gateway/nginx/sites/my-collection.conf
scp deploy/nginx/locations/my-collection-app.conf huawei-flexus:/opt/gateway/nginx/locations/my-collection-app.conf
ssh huawei-flexus 'nginx -t && systemctl reload nginx'
```

`nginx -t` 不通过就不要 reload —— 当前进程会继续用旧配置跑，不会断站。

## 校验两份是否一致

```bash
diff <(ssh huawei-flexus 'cat /opt/gateway/nginx/sites/my-collection.conf') \
     deploy/nginx/my-collection.conf && echo 一致
```

## 这个站点的几个关键点

- `root /var/www/my-collection`，`try_files $uri $uri/ /index.html` —— HashRouter 的
  hash 不发给服务器，这条是双保险。
- `/api/` 反代到 `127.0.0.1:3000`，`proxy_pass` **不带尾部斜杠和路径**，前缀原样透传。
  `location = /api/v1/healthz` 写在 `/api/` 之前，靠最长前缀优先命中且不限流。
- `/assets/` 一年 immutable 缓存（文件名带 content hash）；`/index.html` 是 `no-store`，
  否则用户永远拿旧版本。
- 限流 `limit_req zone=api burst=20 nodelay`，桶定义在 `/etc/nginx/nginx.conf`。
- 这个 server **不是** `default_server`，未知 Host 的兜底 404 由 `00-default.conf` 承担。
- 三个 server：`80 + 121.36.46.119 / my-collection.local`（直出站点，域名或证书故障时的回退入口）、
  `80 + qiyaoqi.pw / www.qiyaoqi.pw`（`return 301 https://$host$request_uri`）、
  `443 + 域名`（证书 `/opt/gateway/certs/qiyaoqi.pw/`，`acme.sh` 续期）。
- 域名站里的 `location ^~ /.well-known/acme-challenge/` **必须排在 dotfile deny 之前**：`.well-known`
  以点开头，被 `location ~ /\.` 吃掉就会让续期 403、证书悄悄过期。
- 没开 HSTS：证书续期失败或想临时退回 http 时，HSTS 会把浏览器锁死。
- 域名/证书/备案的来龙去脉与踩过的坑见 `deploy/HUAWEI-CLOUD.md` 的「备案与域名」。