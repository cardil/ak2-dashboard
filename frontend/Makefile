# --- Frontend Makefile ---

# Define colors and icons for better readability
ESC := $(shell printf '\033')
BLUE := $(ESC)[38;2;30;144;255m
GREEN := $(ESC)[0;32m
YELLOW := $(ESC)[1;33m
RED := $(ESC)[0;31m
NC := $(ESC)[0m
TICK := $(GREEN)✔$(NC)
CROSS := $(RED)✖$(NC)
INFO := $(BLUE)ℹ$(NC)
WARN := $(YELLOW)⚠$(NC)
ARROW := $(BLUE)➜$(NC)

# Define source files and stamp files for intelligent builds
SOURCE_FILES := $(shell find src -type f) package.json package-lock.json svelte.config.js tsconfig.json vite.config.ts
TEST_FILES := $(shell find test -type f)
STATIC_FILES := $(shell find static -type f)
FRONTEND_TARGET := ../webserver/opt/webfs/
RSYNC_GUARD := $(shell find ../webserver/opt/webfs/)
STAMP_DIR := ../.stamps
LINT_STAMP := $(STAMP_DIR)/.frontend-lint.stamp
COMPILE_STAMP := $(STAMP_DIR)/.frontend-compile.stamp
TEST_STAMP := $(STAMP_DIR)/.frontend-test.stamp

.PHONY: all build init lint compile test clean help build-only init lint-only compile-only test-only

all: build ## Build the frontend (default)

init: node_modules ## Initialize the project

node_modules: package.json package-lock.json
	@echo "$(BLUE)➜ Installing frontend dependencies...$(NC)"
	npm install
	./node_modules/.bin/allow-scripts
	@touch node_modules
	@mkdir -p $(STAMP_DIR)

lint-only: $(LINT_STAMP) ## Lint the sources

$(LINT_STAMP): $(SOURCE_FILES)
	@echo "$(BLUE)➜ Linting frontend...$(NC)"
	npm run lint
	@mkdir -p $(STAMP_DIR)
	@touch $(LINT_STAMP)

lint: init lint-only ## Lint the sources (runs also: init)

compile-only: $(COMPILE_STAMP) ## Compile the sources

$(COMPILE_STAMP): $(SOURCE_FILES)
	@echo "$(BLUE)➜ Checking frontend...$(NC)"
	npm run check
	@mkdir -p $(STAMP_DIR)
	@touch $(COMPILE_STAMP)

compile: lint compile-only ## Compile the sources (runs also: init, lint)

test-only: $(TEST_STAMP) ## Run tests

$(TEST_STAMP): $(SOURCE_FILES) $(TEST_FILES)
	@echo "$(BLUE)➜ Testing frontend...$(NC)"
	npm run test
	@mkdir -p $(STAMP_DIR)
	@touch $(TEST_STAMP)

test: compile test-only ## Run tests (runs also: init, lint, compile)

build-only: $(FRONTEND_TARGET) ## Builds the artifacts

dist: node_modules $(SOURCE_FILES) $(STATIC_FILES) ../DOCS.md
	@echo "$(BLUE)➜ Building frontend...$(NC)"
	rm -rf dist
	npm run build

$(FRONTEND_TARGET): dist
	@echo "$(BLUE)➜ Syncing frontend build to webserver...$(NC)"
	rsync -av --delete \
		--exclude 'files' \
		--exclude 'api' \
		--exclude 'deprecated' \
		dist/ \
		$(FRONTEND_TARGET)

build: test build-only ## Builds the artifacts (runs also: init, lint, compile, test)

clean: ## Clean the project
	@echo "$(BLUE)➜ Cleaning frontend...$(NC)"
	rm -rf node_modules dist .svelte-kit
	rm -f test/mocks/mockCommands.json
	git clean -fdx ../webserver/opt/webfs

help: ## Display this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

.DEFAULT_GOAL := all
