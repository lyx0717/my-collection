# nginx 网关配置（仓库镜像）

服务器上真正生效的配置在 `/opt/gateway/nginx/`，这里是它的逐字节副本，
用于**服务器整机重装时恢复**，也方便在本地 `diff` 出线上到底改成什么样了。

## 文件对应关系

| 仓库 | 服务器 |
|---|---|
| `deploy/nginx/my-collection.conf` | `/opt/gateway/nginx/sites/my-collection.conf` |
| `deploy/nginx/snippets/gzip.conf` | `/opt/gateway/nginx/snippets/gzip.conf` |
| `deploy/nginx/snippets/proxy_common.conf` | `/opt/gateway/nginx/snippets/proxy_common.conf` |
| `deploy/nginx/snippets/security-headers.conf` | `/opt/gateway/nginx/snippets/security-headers.conf` |

`snippets/` 是**整机多项目共用**的，不属于本项目独有；`sites/` 下一项目一个文件。
同机还有另一个项目的 `libretv.conf`，不在本仓库里。

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
for f in gzip proxy_common security-headers; do
  scp "huawei-flexus:/opt/gateway/nginx/snippets/$f.conf" "deploy/nginx/snippets/$f.conf"
done
git diff -- deploy/nginx/     # 确认改动就是你以为的那几行
```

## 改了仓库然后推到服务器

```bash
scp deploy/nginx/my-collection.conf huawei-flexus:/opt/gateway/nginx/sites/my-collection.conf
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