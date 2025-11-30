# E2E Test Makefile
# This Makefile contains all E2E testbed and testing targets

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

DOCKER := $(shell command -v docker 2>/dev/null || command -v podman 2>/dev/null)
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))/..

# E2E testbed ports
E2E_SSH_PORT ?= 20022
E2E_HTTP_PORT ?= 20080

# Gen mesh command - injectable for different environments
# Default: SSH to local testbed
# For real hardware: E2E_GEN_MESH_CMD="ssh root@192.168.1.x '/opt/scripts/gen-bed-mesh.sh'"
E2E_GEN_MESH_CMD ?= sshpass -p 'toor' ssh -o StrictHostKeyChecking=no \
	-p $(E2E_SSH_PORT) root@localhost '/opt/scripts/gen-bed-mesh.sh'

.PHONY: up down deploy gen-mesh clean test test-ui test-debug test-headed init help all

up: ## Start the E2E testbed container
	@echo ""
	@echo "$(BLUE)➜ Starting E2E Testbed...$(NC)"
	@if [ -z "$(DOCKER)" ]; then \
		echo "$(CROSS) Error: Neither docker nor podman found in PATH"; \
		exit 1; \
	fi
	@$(DOCKER) compose up -d --build --wait
	@echo ""
	@echo "$(TICK) E2E Testbed started successfully!"
	@echo "$(INFO) SSH access: $(BLUE)ssh -p $(E2E_SSH_PORT) root@localhost$(NC) (password: toor)"
	@echo "$(INFO) HTTP will be available at: $(BLUE)http://localhost:$(E2E_HTTP_PORT)$(NC) (after deployment)"
	@echo ""
	@echo "$(INFO) To deploy, run: $(BLUE)make deploy$(NC) (from e2e dir)"
	@echo ""

down: ## Stop and remove the E2E testbed container
	@echo ""
	@echo "$(BLUE)➜ Stopping E2E Testbed...$(NC)"
	@$(DOCKER) compose down
	@echo "$(TICK) E2E Testbed stopped"
	@echo ""

# Debug webfsd command for E2E - logs to printer log file
# The command runs in background; using nohup to detach properly
E2E_WEBFSD_CMD ?= nohup /opt/bin/webfsd -d -p 80 > /mnt/UDISK/log 2>&1 & sleep 1

deploy: ## Deploy to the E2E testbed (builds first)
	@echo ""
	@echo "$(BLUE)➜ Deploying to E2E Testbed...$(NC)"
	@$(MAKE) -C $(ROOT_DIR) deploy PRINTER_IP=localhost \
		PRINTER_PORT=$(E2E_SSH_PORT) PRINTER_USER=root WEBFSD_PORT=80 \
		PRINTER_PASSWORD=toor WEBFSD_CMD="$(E2E_WEBFSD_CMD)"

gen-mesh: ## Generate bed mesh points in testbed (simulates leveling)
	@echo ""
	@echo "$(BLUE)➜ Generating bed mesh in testbed...$(NC)"
	@$(E2E_GEN_MESH_CMD)
	@echo ""

clean: ## Stop testbed and remove volumes
	@echo ""
	@echo "$(BLUE)➜ Cleaning E2E Testbed...$(NC)"
	@$(DOCKER) compose down -v
	@rm -rf volumes node_modules
	@echo "$(TICK) E2E Testbed cleaned"
	@echo ""

node_modules/.playwright-installed: package.json
	@echo ""
	@echo "$(BLUE)➜ Installing E2E test dependencies...$(NC)"
	@npm install
	@./node_modules/.bin/allow-scripts
	@touch node_modules/.playwright-installed
	@echo "$(TICK) E2E test dependencies installed"
	@echo ""

init: node_modules/.playwright-installed ## Install E2E test dependencies

# Optional args for playwright test (e.g., ARGS='--grep "test name"')
ARGS ?=

test: init ## Run E2E tests (requires testbed running). Use ARGS='--grep "test"' to filter
	@echo ""
	@echo "$(BLUE)➜ Running E2E tests...$(NC)"
	@E2E_BASE_URL=http://localhost:$(E2E_HTTP_PORT) \
		E2E_GEN_MESH_CMD="$(E2E_GEN_MESH_CMD)" \
		npm test -- $(ARGS)
	@echo ""

test-ui: init ## Run E2E tests with Playwright UI
	@echo ""
	@echo "$(BLUE)➜ Running E2E tests with UI...$(NC)"
	@E2E_BASE_URL=http://localhost:$(E2E_HTTP_PORT) \
		E2E_GEN_MESH_CMD="$(E2E_GEN_MESH_CMD)" \
		npm run test:ui
	@echo ""

test-debug: init ## Run E2E tests in debug mode
	@echo ""
	@echo "$(BLUE)➜ Running E2E tests in debug mode...$(NC)"
	@E2E_BASE_URL=http://localhost:$(E2E_HTTP_PORT) \
		E2E_GEN_MESH_CMD="$(E2E_GEN_MESH_CMD)" \
		npm run test:debug
	@echo ""

test-headed: init ## Run E2E tests with browser visible
	@echo ""
	@echo "$(BLUE)➜ Running E2E tests in headed mode...$(NC)"
	@E2E_BASE_URL=http://localhost:$(E2E_HTTP_PORT) \
		E2E_GEN_MESH_CMD="$(E2E_GEN_MESH_CMD)" \
		npm run test:headed
	@echo ""

all: up deploy test ## Run the full E2E pipeline: up, deploy, test, down
	@$(MAKE) down || true
	@echo ""
	@echo "$(TICK) E2E pipeline completed"
	@echo ""

help: ## Display this help message
	@echo "E2E Testing Makefile"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Environment Variables:"
	@echo "  E2E_SSH_PORT       SSH port for testbed (default: 20022)"
	@echo "  E2E_HTTP_PORT      HTTP port for testbed (default: 20080)"
	@echo "  E2E_GEN_MESH_CMD   Command to generate bed mesh (injectable for real hardware)"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

.DEFAULT_GOAL := help