# staff-report 開発用 Makefile
# `make help` で使えるコマンド一覧を表示
#
# PostgreSQL は Docker を使う方法と、PCに直接インストールする方法のどちらでもOK
#   - Docker を使う人:     make setup
#   - Docker を使わない人: PostgreSQL をインストール・起動してから make setup-local

SERVICE_DIR := apps/service
ENV_FILE := $(SERVICE_DIR)/.env
ENV_EXAMPLE := $(SERVICE_DIR)/.env.example

# ローカル PostgreSQL 用の接続設定（必要なら上書き可能）
# 例: make setup-local DB_USER=postgres DB_PASSWORD=postgres
DB_NAME ?= staff_report
DB_HOST ?= localhost
DB_PORT ?= 5432
DB_USER ?= $(shell whoami)
DB_PASSWORD ?=

ifeq ($(DB_PASSWORD),)
LOCAL_DATABASE_URL := postgresql://$(DB_USER)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)
else
LOCAL_DATABASE_URL := postgresql://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)
endif

PSQL := PGPASSWORD='$(DB_PASSWORD)' psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER)

.DEFAULT_GOAL := help

.PHONY: help setup setup-local check-tools check-tools-local install env env-local \
	db-up db-down db-reset db-create-local db-migrate db-generate db-studio \
	gen-api dev stop build test lint typecheck format

help: ## コマンド一覧を表示
	@echo ""
	@echo "staff-report 開発コマンド"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "初めての人（Docker を使う場合）  : make setup → make dev"
	@echo "初めての人（Docker を使わない場合）: PostgreSQL を起動してから make setup-local → make dev"
	@echo ""

# ---------------------------------------------------------------------------
# セットアップ（Docker 版）
# ---------------------------------------------------------------------------

setup: check-tools install env db-up db-migrate ## 環境構築を一括実行（Docker で PostgreSQL を動かす）
	@echo ""
	@echo "✅ セットアップ完了！ 'make dev' で開発サーバを起動できます"

check-tools: ## 必要なツール (Node.js 22+ / pnpm 10+ / Docker) が入っているか確認
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js が見つかりません。https://nodejs.org から v22 以上をインストールしてください"; exit 1; }
	@node -e 'process.exit(parseInt(process.versions.node) >= 22 ? 0 : 1)' || { echo "❌ Node.js のバージョンが古いです（v22 以上が必要）。現在: $$(node -v)"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が見つかりません。'npm install -g pnpm' でインストールしてください"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker が見つかりません。https://www.docker.com/products/docker-desktop からインストールしてください（Docker を使わない場合は 'make setup-local' を使ってください）"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "❌ Docker が起動していません。Docker Desktop を起動してください（Docker を使わない場合は 'make setup-local' を使ってください）"; exit 1; }
	@echo "✅ 必要なツールはすべて揃っています"

env: ## .env ファイルを作成 — Docker 用 (既にある場合は何もしない)
	@if [ -f $(ENV_FILE) ]; then \
		echo "✅ $(ENV_FILE) は既に存在します（スキップ）。接続先を変えたい場合はファイルを編集するか、削除して再実行してください"; \
	else \
		cp $(ENV_EXAMPLE) $(ENV_FILE); \
		echo "✅ $(ENV_FILE) を作成しました（Docker の PostgreSQL: localhost:5433 に接続）"; \
	fi

db-up: ## [Docker] PostgreSQL を起動 (localhost:5433)
	docker compose up -d --wait

db-down: ## [Docker] PostgreSQL を停止
	docker compose down

db-reset: ## [Docker] PostgreSQL をデータごと削除して作り直す（注意: データは消えます）
	docker compose down -v
	docker compose up -d --wait
	pnpm --filter @staff-report/api db:migrate

# ---------------------------------------------------------------------------
# セットアップ（Docker なし・ローカル PostgreSQL 版）
# ---------------------------------------------------------------------------

setup-local: check-tools-local install env-local db-create-local db-migrate ## 環境構築を一括実行（PCにインストールした PostgreSQL を使う）
	@echo ""
	@echo "✅ セットアップ完了！ 'make dev' で開発サーバを起動できます"

check-tools-local: ## 必要なツール (Node.js 22+ / pnpm 10+ / PostgreSQL) が入っているか確認
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js が見つかりません。https://nodejs.org から v22 以上をインストールしてください"; exit 1; }
	@node -e 'process.exit(parseInt(process.versions.node) >= 22 ? 0 : 1)' || { echo "❌ Node.js のバージョンが古いです（v22 以上が必要）。現在: $$(node -v)"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が見つかりません。'npm install -g pnpm' でインストールしてください"; exit 1; }
	@command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL (psql) が見つかりません。README の「PostgreSQL のインストール」を参照してください"; exit 1; }
	@$(PSQL) -d postgres -c 'SELECT 1' >/dev/null 2>&1 || { \
		echo "❌ PostgreSQL に接続できません ($(DB_HOST):$(DB_PORT), ユーザー: $(DB_USER))"; \
		echo "   - PostgreSQL が起動しているか確認してください（macOS: brew services start postgresql@17）"; \
		echo "   - ユーザー名やパスワードが違う場合は変数で指定できます:"; \
		echo "     例: make setup-local DB_USER=postgres DB_PASSWORD=postgres"; \
		exit 1; }
	@echo "✅ 必要なツールはすべて揃っています"

env-local: ## .env ファイルを作成 — ローカル PostgreSQL 用 (既にある場合は何もしない)
	@if [ -f $(ENV_FILE) ]; then \
		echo "✅ $(ENV_FILE) は既に存在します（スキップ）"; \
		echo "   Docker 用から切り替える場合は $(ENV_FILE) の DATABASE_URL を以下に書き換えてください:"; \
		echo "   DATABASE_URL=$(LOCAL_DATABASE_URL)"; \
	else \
		{ echo "PORT=3000"; \
		  echo "NODE_ENV=development"; \
		  echo "DATABASE_URL=$(LOCAL_DATABASE_URL)"; } > $(ENV_FILE); \
		echo "✅ $(ENV_FILE) を作成しました（ローカルの PostgreSQL: $(DB_HOST):$(DB_PORT) に接続）"; \
	fi

db-create-local: ## [ローカル] データベース (staff_report) がなければ作成
	@if $(PSQL) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$(DB_NAME)'" | grep -q 1; then \
		echo "✅ データベース $(DB_NAME) は既に存在します（スキップ）"; \
	else \
		$(PSQL) -d postgres -c "CREATE DATABASE $(DB_NAME)"; \
		echo "✅ データベース $(DB_NAME) を作成しました"; \
	fi

# ---------------------------------------------------------------------------
# 共通コマンド
# ---------------------------------------------------------------------------

install: ## 依存パッケージをインストール
	pnpm install

db-migrate: ## マイグレーション適用 + Prisma クライアント生成
	pnpm --filter @staff-report/api db:migrate

db-generate: ## Prisma クライアント生成のみ
	pnpm --filter @staff-report/api db:generate

db-studio: ## Prisma Studio（DB を GUI で見るツール）を起動
	pnpm --filter @staff-report/api db:studio

gen-api: ## service の OpenAPI から web の API 型・hooks を再生成（orval）
	pnpm --filter @staff-report/api openapi:export
	pnpm --filter @staff-report/web gen:api

dev: ## 開発サーバ起動 (web: http://localhost:5173 / api: http://localhost:3000)
	pnpm dev

stop: ## 開発サーバの残プロセスを一括停止（ゾンビ掃除・ポート解放）
	-@pkill -f "bin/pnpm dev" 2>/dev/null || true
	-@pkill -f "tsx/dist/cli.mjs watch" 2>/dev/null || true
	-@pkill -f "loader.mjs.*src/main.ts" 2>/dev/null || true
	-@pkill -f "node_modules/.pnpm/vite@" 2>/dev/null || true
	@echo "✅ 開発サーバプロセスを停止しました（3000 / 5173 を確認してください）"

build: ## 全アプリをビルド
	pnpm build

test: ## テスト実行
	pnpm test

lint: ## Lint 実行
	pnpm lint

typecheck: ## 型チェック
	pnpm typecheck

format: ## コードフォーマット
	pnpm format
