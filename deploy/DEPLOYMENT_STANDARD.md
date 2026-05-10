# GopayPlus 2C2G 轻量部署标准

本项目部署到 2C2G 小服务器时，必须遵守以下约束：

- 服务器只负责拉取固定 tag 镜像、启动容器和检查状态。
- 禁止在服务器执行 `docker build`、`docker compose up -d --build`、`npm install`、`npm ci`、`npm run build`、`npx playwright install`。
- 生产环境禁止使用 `latest`。
- 没有 release 文档，不允许部署。
- 没有用户明确审核通过，不允许部署。
- 没有用户明确批准，不允许执行 `docker compose pull`、`docker compose up -d`、`docker run`、替换线上服务、删除旧服务或切换正式端口。
- 标准部署目录为 `/opt/gopayplus`。
- 标准固定镜像格式为 `ghcr.io/ywain-zh/gopayplus:<fixed-tag>`。

## 标准检查命令

```bash
cd /opt/gopayplus
pwd
ls -lah
test -f .env
test -d data/mysql || mkdir -p data/mysql
test -d product_files || mkdir -p product_files
test -d debug_screenshots || mkdir -p debug_screenshots
test -f "$RELEASE_DOC"
grep '^APP_IMAGE=' .env
grep -q ':latest$' .env && echo 'ERROR: latest is forbidden' && exit 1 || echo 'APP_IMAGE tag ok'
docker compose --env-file .env -f compose.yml ps
docker ps --filter name=gopayplus
```

## 批准后的部署命令

```bash
cd /opt/gopayplus
cp .env ".env.bak.${IMAGE_TAG}"
sed -i "s#^APP_IMAGE=.*#APP_IMAGE=${APP_IMAGE}#" .env
docker compose --env-file .env -f compose.yml pull
docker compose --env-file .env -f compose.yml up -d
docker compose --env-file .env -f compose.yml ps
docker compose --env-file .env -f compose.yml logs --tail=200 gopayplus-app
docker stats --no-stream
curl -fsS http://127.0.0.1:3000/api/public/runtime
free -h
df -h
```

## 回滚命令

```bash
cd /opt/gopayplus
sed -i "s#^APP_IMAGE=.*#ghcr.io/ywain-zh/gopayplus:<previous-tag>#" .env
docker compose --env-file .env -f compose.yml pull
docker compose --env-file .env -f compose.yml up -d
docker compose --env-file .env -f compose.yml ps
curl -fsS http://127.0.0.1:3000/api/public/runtime
```
