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
	lint-only compile-only test-only deploy e2e-up e2e-down e2e-deploy \
	e2e-logs e2e-clean

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

test: ## Run tests
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

# --- Deployment Configuration ---
deploy: build ## Deploy to printer via SSH (interactive or: make deploy PRINTER_IP=192.168.1.100)
	@PRINTER_IP="$(PRINTER_IP)" \
	PRINTER_USER="$(PRINTER_USER)" \
	PRINTER_PORT="$(PRINTER_PORT)" \
	WEBFSD_PORT="$(WEBFSD_PORT)" \
	PRINTER_PASSWORD="$(PRINTER_PASSWORD)" \
	./scripts/deploy.sh

# --- E2E Testbed ---
DOCKER := $(shell command -v docker 2>/dev/null || command -v podman 2>/dev/null)

e2e-up: ## Start the E2E testbed container
	@echo ""
	@echo "$(BLUE)➜ Starting E2E Testbed...$(NC)"
	@if [ -z "$(DOCKER)" ]; then \
		echo "$(CROSS) Error: Neither docker nor podman found in PATH"; \
		exit 1; \
	fi
	@cd e2e && $(DOCKER) compose up -d --build
	@echo ""
	@echo "$(TICK) E2E Testbed started successfully!"
	@echo "$(INFO) SSH access: $(BLUE)ssh -p 2222 root@localhost$(NC) (password: toor)"
	@echo "$(INFO) HTTP will be available at: $(BLUE)http://localhost:8080$(NC) (after deployment)"
	@echo ""
	@echo "$(INFO) To deploy, run: $(BLUE)make e2e-deploy$(NC)"
	@echo ""

e2e-down: ## Stop and remove the E2E testbed container
	@echo ""
	@echo "$(BLUE)➜ Stopping E2E Testbed...$(NC)"
	@cd e2e && $(DOCKER) compose down
	@echo "$(TICK) E2E Testbed stopped"
	@echo ""

e2e-deploy: build ## Deploy to the E2E testbed
	@echo ""
	@echo "$(BLUE)➜ Deploying to E2E Testbed...$(NC)"
	@$(MAKE) deploy PRINTER_IP=localhost PRINTER_PORT=2222 PRINTER_USER=root WEBFSD_PORT=80 PRINTER_PASSWORD=toor

e2e-clean: ## Stop testbed and remove volumes
	@echo ""
	@echo "$(BLUE)➜ Cleaning E2E Testbed...$(NC)"
	@cd e2e && $(DOCKER) compose down -v
	@rm -rf e2e/volumes
	@echo "$(TICK) E2E Testbed cleaned"
	@echo ""

clean: e2e-clean ## Clean the project
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
