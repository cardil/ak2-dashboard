# --- Pre-execution Setup ---

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
# --- Makefile Targets ---

.PHONY: all build init lint compile test clean help build-only init-only \
	lint-only compile-only test-only deploy

all: build ## Build the entire project (default)

build: test build-only ## Run the entire build pipeline (uses Docker/Podman for ARM cross-compilation)

init: ## Initialize the project
	@$(MAKE) -C frontend init
	@$(MAKE) -C src init

lint: ## Lint the project
	@$(MAKE) -C frontend lint
	@$(MAKE) -C src lint

compile: ## Compile the project
	@$(MAKE) -C frontend compile
	@$(MAKE) -C src compile

test: ## Run tests (unit and smoke)
	@$(MAKE) -C frontend test
	@$(MAKE) -C src test

build-only: ## Build and package the project
	@echo ""
	@echo "$(BLUE)➜ Building and Packaging AK2 Dashboard...$(NC)"
	@$(MAKE) -C frontend build-only
	@$(MAKE) -C src build-only
	@echo ""
	@echo "$(BLUE)➜ Creating package...$(NC)"
	@rm -f webserver/webserver.zip
	@cd webserver && zip -q -r --symlinks webserver.zip etc opt
	@echo "$(TICK) SUCCESS! The package is ready in: $(GREEN)webserver/webserver.zip$(NC)"
	@echo "$(INFO) Size: $$(du -h webserver/webserver.zip | awk '{print $$1}')"

lint-only: ## Lint the project without running the pipeline
	@$(MAKE) -C frontend lint-only
	@$(MAKE) -C src lint-only

compile-only: ## Compile the project without running the pipeline
	@$(MAKE) -C frontend compile-only
	@$(MAKE) -C src compile-only

test-only: ## Run tests without running the pipeline
	@$(MAKE) -C frontend test-only
	@$(MAKE) -C src test-only

e2e: build ## Run the full E2E test pipeline (start testbed, deploy, test, cleanup)
	@$(MAKE) -C e2e all

# --- Deployment Configuration ---
deploy: build ## Deploy to printer via SSH (interactive or: make deploy PRINTER_IP=192.168.1.100)
	@PRINTER_IP="$(PRINTER_IP)" \
	PRINTER_USER="$(PRINTER_USER)" \
	PRINTER_PORT="$(PRINTER_PORT)" \
	WEBFSD_PORT="$(WEBFSD_PORT)" \
	PRINTER_PASSWORD="$(PRINTER_PASSWORD)" \
	./scripts/deploy.sh

clean: ## Clean the project
	@$(MAKE) -C e2e clean
	@echo ""
	@echo "$(BLUE)➜ Cleaning frontend...$(NC)"
	@$(MAKE) -C frontend clean
	@echo ""
	@echo "$(BLUE)➜ Cleaning backend...$(NC)"
	@$(MAKE) -C src clean
	@echo ""
	@echo "$(BLUE)➜ Removing artifacts...$(NC)"
	@rm -f webserver/webserver.zip

help: ## Display this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

.DEFAULT_GOAL := all
