# Makefile for kana-site
# Usage examples:
#   make setup        # install deps, sync vendor assets, verify node
#   make dev          # start dev server (vite)
#   make build        # production build
#   make serve        # preview production build
#   make format       # run prettier --write .
#   make lint         # run eslint . --fix
#   make check        # eslint + prettier --check
#   make fetch-skk    # download SKK-JISYO.L into /public/dict
#   make clean        # remove node_modules & build artifacts

SHELL := bash
.ONESHELL:
.SILENT:

NODE ?= node
NPM  ?= npm

# Paths
PUBLIC_DIR      := public
VENDOR_DIR      := $(PUBLIC_DIR)/vendor
KUROMOJI_JS     := $(VENDOR_DIR)/kuromoji/kuromoji.js
IPADIC_DIR      := $(VENDOR_DIR)/ipadic
DICT_DIR        := $(PUBLIC_DIR)/dict
SKK_FILE        := $(DICT_DIR)/SKK-JISYO.L

# Tools
SHX := npx shx

# --- Helpers -----------------------------------------------------------------

# Check Node >= 18 (Mozc/some libs need newer; Vite likes 18+; 20 LTS recommended)
define check_node
ver_str="$$( $(NODE) -v 2>/dev/null || echo v0.0.0 )"
maj=$${ver_str#v}; maj=$${maj%%.*}
if [[ $$maj -lt 18 ]]; then
  echo "✘ Node $$ver_str detected. Please install Node 20 LTS (recommended)."
  echo "  Windows:   winget install OpenJS.NodeJS.LTS   (or use nvm-windows)"
  echo "  macOS:     brew install node@20"
  echo "  Linux:     use nvm or your package manager"
  exit 1
else
  echo "✔ Node $$ver_str OK"
fi
endef

# Copy kuromoji assets from node_modules to /public/vendor
define sync_vendor
$(SHX) mkdir -p $(VENDOR_DIR)/kuromoji $(IPADIC_DIR)
$(SHX) cp node_modules/kuromoji/dist/kuromoji.js $(VENDOR_DIR)/kuromoji/
$(SHX) cp -r node_modules/kuromoji/dict/* $(IPADIC_DIR)/
echo "✔ Synced kuromoji assets into $(VENDOR_DIR)"
endef

# --- Targets ------------------------------------------------------------------

.PHONY: help
help:
	echo "Targets:"
	echo "  make setup       Install deps, sync vendor assets, verify Node"
	echo "  make dev         Start dev server"
	echo "  make build       Production build"
	echo "  make serve       Preview build"
	echo "  make format      Run Prettier (write)"
	echo "  make lint        Run ESLint (fix)"
	echo "  make check       ESLint + Prettier check"
	echo "  make fetch-skk   Download SKK-JISYO.L"
	echo "  make clean       Remove node_modules and dist"

.PHONY: verify-node
verify-node:
	$(call check_node)

# Installs deps using ci if lockfile exists
.PHONY: install
install:
	if [[ -f package-lock.json ]]; then
	  echo "Using npm ci"; $(NPM) ci
	else
	  echo "Using npm install"; $(NPM) install
	fi
# ===== SKK dictionary fetch/install (zero manual steps) =====
PUBLIC_DIR      := public
DICT_DIR        := $(PUBLIC_DIR)/dict
SKK_URL         := https://raw.githubusercontent.com/skk-dev/dict/master/SKK-JISYO.L
SKK_PATH        := $(DICT_DIR)/SKK-JISYO.L

.PHONY: fetch-skk verify-skk clean-skk

fetch-skk:
	@mkdir -p "$(DICT_DIR)"
	@echo "[SKK] fetching $(SKK_URL)"
	@curl -L --fail -o "$(SKK_PATH).tmp" "$(SKK_URL)"
	@# verify not HTML and roughly large enough (> 5MB)
	@head -c 15 "$(SKK_PATH).tmp" | grep -q ";;" || { echo "[SKK] ERROR: looks like HTML or wrong file"; rm -f "$(SKK_PATH).tmp"; exit 1; }
	@[ $$(wc -c < "$(SKK_PATH).tmp") -gt 5000000 ] || { echo "[SKK] ERROR: too small ($$(wc -c < "$(SKK_PATH).tmp") bytes)"; rm -f "$(SKK_PATH).tmp"; exit 1; }
	@mv -f "$(SKK_PATH).tmp" "$(SKK_PATH)"
	@echo "[SKK] saved → $(SKK_PATH)"

verify-skk:
	@echo "[SKK] verifying $(SKK_PATH)"
	@test -f "$(SKK_PATH)" || { echo "[SKK] MISSING"; exit 1; }
	@head -c 15 "$(SKK_PATH)" | grep -q ";;" || { echo "[SKK] ERROR: not SKK text"; exit 1; }
	@[ $$(wc -c < "$(SKK_PATH)") -gt 5000000 ] || { echo "[SKK] ERROR: file too small"; exit 1; }
	@echo "[SKK] OK: $$(wc -c < "$(SKK_PATH)") bytes"

clean-skk:
	@rm -f "$(SKK_PATH)"



# ===== Kuromoji + IPADIC install =====
PUBLIC_DIR       := public
KUROMOJI_DST_DIR := $(PUBLIC_DIR)/vendor/kuromoji
IPADIC_DST_DIR   := $(PUBLIC_DIR)/vendor/ipadic

KUROMOJI_JS_SRC  := node_modules/kuromoji/build/kuromoji.js
IPADIC_SRC_DIR   := node_modules/kuromoji/dict

.PHONY: install-kuromoji
install-kuromoji:
	@echo "[KRMJ] Installing kuromoji.js and IPADIC"
	@test -f "$(KUROMOJI_JS_SRC)" || { echo "[KRMJ] ERROR: kuromoji not installed. Run: npm i kuromoji"; exit 1; }
	@test -d "$(IPADIC_SRC_DIR)"   || { echo "[KRMJ] ERROR: ipadic missing in node_modules/kuromoji/dict"; exit 1; }
	@mkdir -p "$(KUROMOJI_DST_DIR)" "$(IPADIC_DST_DIR)"
	@cp -f "$(KUROMOJI_JS_SRC)" "$(KUROMOJI_DST_DIR)/kuromoji.js"
	@cp -f "$(IPADIC_SRC_DIR)"/base.dat.gz      "$(IPADIC_DST_DIR)/base.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/cc.dat.gz        "$(IPADIC_DST_DIR)/cc.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/check.dat.gz     "$(IPADIC_DST_DIR)/check.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/tid.dat.gz       "$(IPADIC_DST_DIR)/tid.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/tid_map.dat.gz   "$(IPADIC_DST_DIR)/tid_map.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/tid_pos.dat.gz   "$(IPADIC_DST_DIR)/tid_pos.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/unk.dat.gz       "$(IPADIC_DST_DIR)/unk.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/unk_char.dat.gz  "$(IPADIC_DST_DIR)/unk_char.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/unk_compat.dat.gz "$(IPADIC_DST_DIR)/unk_compat.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/unk_invoke.dat.gz "$(IPADIC_DST_DIR)/unk_invoke.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/unk_map.dat.gz   "$(IPADIC_DST_DIR)/unk_map.dat.gz"
	@cp -f "$(IPADIC_SRC_DIR)"/unk_pos.dat.gz   "$(IPADIC_DST_DIR)/unk_pos.dat.gz"
	@echo "[KRMJ] Copied kuromoji + ipadic → public/vendor/*"

# Quick integrity check: base.dat.gz must be gzip (1F 8B)
.PHONY: verify-kuromoji
verify-kuromoji:
	@echo "[KRMJ] Verifying IPADIC magic"
	@xxd -p -l 2 "$(IPADIC_DST_DIR)/base.dat.gz" | grep -qi '^1f8b' || { echo "[KRMJ] ERROR: base.dat.gz is not gzip"; exit 1; }
	@echo "[KRMJ] OK: base.dat.gz is gzip"


# Sync vendor assets (kuromoji + IPADIC) from node_modules
.PHONY: vendor-sync
vendor-sync:
	$(call sync_vendor)

# One-shot setup: verify node, install deps, sync vendor, ensure dict dir
.PHONY: setup
setup: verify-node install vendor-sync
	$(SHX) mkdir -p $(DICT_DIR)
	echo "✔ Setup complete"

# Dev / build / serve
# Wire into your flows
dev: install-kuromoji 
	@npm run dev

build: install-kuromoji clean-skk fetch-skk
	@npm run build

.PHONY: serve
serve:
	$(NPM) run serve


.PHONY: format lint
format:
	npm run format

lint:
	npm run lint


.PHONY: check
check:
	npx eslint .
	npx prettier --check .

# Clean
.PHONY: clean
clean:
	$(SHX) rm -rf node_modules dist $(KUROMOJI_JS) $(IPADIC_DIR)
	echo "✔ Cleaned"

.PHONY: vendor-sync
vendor-sync:
	npx shx mkdir -p public/vendor/kuromoji public/vendor/ipadic
	npx shx cp node_modules/kuromoji/build/kuromoji.js public/vendor/kuromoji/
	npx shx cp -r node_modules/kuromoji/dict/* public/vendor/ipadic/

.PHONY: fetch-skk
fetch-skk:
	npm run fetch:skk

.PHONY: setup
setup:
	npm run setup

# ---- GitHub Pages staging from repo root index.html + public/* ----
SRC_PUBLIC := public
SRC_INDEX  := index.html
OUT_DOCS   := docs

.PHONY: pages-clean pages-stage pages-verify pages-build pages-deploy

pages-clean:
	@echo "[pages] clean $(OUT_DOCS)"
	@rm -rf "$(OUT_DOCS)"

pages-stage:
	@echo "[pages] staging → $(OUT_DOCS)"
	@mkdir -p "$(OUT_DOCS)"
	# 1) mirror all runtime assets from public/ → docs/
	#    (rsync is idempotent and preserves dirs/files; fallback cp if rsync unavailable)
	@if command -v rsync >/dev/null 2>&1; then \
		rsync -a --delete "$(SRC_PUBLIC)/" "$(OUT_DOCS)/"; \
	else \
		cp -a "$(SRC_PUBLIC)/." "$(OUT_DOCS)/"; \
	fi
	# 2) copy root index.html
	@cp "$(SRC_INDEX)" "$(OUT_DOCS)/index.html"
	# 3) ensure Pages doesn't run Jekyll transforms
	@touch "$(OUT_DOCS)/.nojekyll"
	# 4) rewrite staged index.html to use relative paths under docs/
	#    - strip any leading /public/ or ./public/
	#    - common absolute asset patterns → relative
	@sed -i.bak \
		-e 's#href="/public/#href="./#g' \
		-e 's#src="/public/#src="./#g' \
		-e 's#href="./public/#href="./#g' \
		-e 's#src="./public/#src="./#g' \
		-e 's#src="/js/#src="./js/#g' \
		-e 's#href="/js/#href="./js/#g' \
		"$(OUT_DOCS)/index.html" || true
	@rm -f "$(OUT_DOCS)/index.html.bak"

pages-verify:
	@echo "[pages] verifying staged site"
	@test -f "$(OUT_DOCS)/index.html" || { echo "missing $(OUT_DOCS)/index.html"; exit 1; }
	# 1) ensure index.html does not reference the public/ prefix anymore
	@! grep -qE '(["'\''])/?public/' "$(OUT_DOCS)/index.html" || { echo "index.html still references public/"; exit 1; }
	# 2) ensure every file under public/ exists under docs/ with same relative path
	@cd "$(SRC_PUBLIC)" && \
		find . -type f -print0 | while IFS= read -r -d '' f; do \
			t="$${f#./}"; \
			test -f "../$(OUT_DOCS)/$$t" || { echo "missing $(OUT_DOCS)/$$t"; exit 1; }; \
		done
	# 3) sanity: docs/ contains something besides index.html and .nojekyll
	@if [ "$$(find "$(OUT_DOCS)" -type f | wc -l)" -lt 3 ]; then \
		echo "⚠️  Warning: docs/ seems light — double-check staging output."; \
	fi
	@echo "[pages] OK"

# convenience wrappers
pages-build: pages-clean pages-stage pages-verify

pages-deploy: pages-build
	@git add "$(OUT_DOCS)"
	@git commit -m "Pages deploy: update docs" || true
	@git push
	@echo
	@echo "Now set GitHub Pages to serve from: main branch /docs"