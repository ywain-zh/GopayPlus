# RELEASE v2026.05.10-1

## 发布日期

2026-05-10

## 发布版本 / tag

- Git tag: `v2026.05.10-1`
- Image: `ghcr.io/ywain-zh/gopayplus:v2026.05.10-1`

## 发布目的

首次按 2C2G 轻量部署标准准备 GopayPlus 容器化发布。服务器只拉取固定 tag 镜像并运行 Compose，不在服务器执行 Node 依赖安装、镜像构建或高负载构建命令。

## 来源分支与同步说明

- 来源分支：`main`
- 本次未涉及上游同步。
- 本次未涉及冲突处理。
- 当前仓库未建立长期 `dev` 发布分支；如后续沿用参考文档的 `dev` 约束，应先创建并切换发布来源到 `dev`。

## 修改文件列表

- `Dockerfile`
- `.dockerignore`
- `.github/workflows/docker-ghcr.yml`
- `deploy/compose.yml`
- `deploy/.env.example`
- `releases/RELEASE-v2026.05.10-1.md`

## 更新内容摘要

- 新增基于 Playwright 官方镜像的应用 Dockerfile。
- 新增 GHCR tag 发布 workflow。
- 新增面向 `/opt/gopayplus` 的 Docker Compose 模板。
- 新增 MySQL 8.0 容器，使用 2C2G 友好的保守参数。
- 新增 app、MySQL、运行产物目录的持久化和健康检查配置。
- 固定生产部署使用 `ghcr.io/ywain-zh/gopayplus:v2026.05.10-1`，禁止 `latest`。

## 配置变更

首次部署需要在服务器 `/opt/gopayplus/.env` 中配置：

- `APP_IMAGE=ghcr.io/ywain-zh/gopayplus:v2026.05.10-1`
- `DB_NAME=plus_papay`
- `DB_USER=gopayplus`
- `DB_PASSWORD=<strong password>`
- `MYSQL_ROOT_PASSWORD=<strong root password>`
- `DB_POOL_LIMIT=5`
- `ADMIN_PASSWORD=<strong admin password>`
- `ADMIN_TOKEN_SECRET=<stable random secret>`
- 按需配置 `CHATGPT_TOKEN`、`STRIPE_KEY`、`SMS_API_KEY`、`PROXY`、邮箱相关变量。

## 数据结构 / 迁移

- 应用仍使用 MySQL。
- 首次启动前 MySQL 容器通过 `MYSQL_DATABASE=plus_papay` 创建数据库。
- 应用启动时使用现有 `mysql-schema.sql` 自动检查并创建/补齐表结构。
- 本次没有手写迁移脚本要求。

## 部署步骤

部署前必须满足：

1. 本 release 文档存在并已审核。
2. Git tag `v2026.05.10-1` 已推送。
3. GHCR 镜像 `ghcr.io/ywain-zh/gopayplus:v2026.05.10-1` 已构建成功且可拉取。
4. 用户明确审核通过并批准执行服务器部署。

批准后在服务器执行：

```bash
export DEPLOY_DIR=/opt/gopayplus
export IMAGE_REPO=ghcr.io/ywain-zh/gopayplus
export IMAGE_TAG=v2026.05.10-1
export APP_IMAGE=${IMAGE_REPO}:${IMAGE_TAG}
export RELEASE_DOC=releases/RELEASE-${IMAGE_TAG}.md

cd "$DEPLOY_DIR"
pwd
ls -lah
test -f .env
test -d data/mysql || mkdir -p data/mysql
test -d product_files || mkdir -p product_files
test -d debug_screenshots || mkdir -p debug_screenshots
test -f "$RELEASE_DOC"
grep '^APP_IMAGE=' .env
grep -q ':latest$' .env && echo 'ERROR: latest is forbidden' && exit 1 || echo 'APP_IMAGE tag ok'
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

## 回滚方式

回滚必须使用上一个已验证固定 tag，禁止使用 `latest`。

```bash
cd /opt/gopayplus
sed -i "s#^APP_IMAGE=.*#ghcr.io/ywain-zh/gopayplus:<previous-tag>#" .env
docker compose --env-file .env -f compose.yml pull
docker compose --env-file .env -f compose.yml up -d
docker compose --env-file .env -f compose.yml ps
curl -fsS http://127.0.0.1:3000/api/public/runtime
```

不要删除 `data/mysql`，除非用户明确要求恢复数据库备份。

## 风险说明

- 服务器内存较小，Playwright 任务运行时可能出现内存压力；默认 `HEADFUL=0`、`DB_POOL_LIMIT=5`，业务并发应从 1 开始。
- 当前健康检查使用 `/api/public/runtime`，它依赖数据库，因此更接近 readiness 检查。
- 首次部署需要填写真实 `.env` 密钥；不得提交到 Git。
- 部署前必须确认没有使用 `latest` 镜像 tag。
