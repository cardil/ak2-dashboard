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

DOCKER := $(shell command -v podman 2>/dev/null || command -v docker 2>/dev/null)
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))/..

# Stamp directory (shared with root Makefile)
STAMP_DIR := $(ROOT_DIR)/.stamps
E2E_ALL_STAMP := $(STAMP_DIR)/.e2e-all.stamp

# Source files that influence E2E tests (excluding build artifacts)
E2E_SOURCES := $(shell find $(ROOT_DIR)/src -type f \( -name '*.c' -o -name '*.h' \) \
		-not -path '*/vendor/*' 2>/dev/null) \
	$(shell find $(ROOT_DIR)/frontend/src -type f \( -name '*.svelte' -o -name '*.ts' -o -name '*.js' \) 2>/dev/null) \
	$(shell find tests -name '*.ts' 2>/dev/null) \
	$(shell find config -type f 2>/dev/null) \
	$(shell find scripts -type f 2>/dev/null) \
	Dockerfile Makefile

# E2E testbed configuration
E2E_IMAGE := localhost/e2e_printer-testbed
E2E_CONTAINER := ak2-testbed
E2E_PLATFORM := linux/arm/v7

# E2E testbed ports
E2E_SSH_PORT ?= 20022
E2E_HTTP_PORT ?= 20080

# Gen mesh command - injectable for different environments
# Default: SSH to local testbed
# For real hardware: E2E_GEN_MESH_CMD="ssh root@192.168.1.x '/opt/scripts/gen-bed-mesh.sh'"
E2E_GEN_MESH_CMD ?= sshpass -p 'toor' ssh -o StrictHostKeyChecking=no \
	-o UserKnownHostsFile=/dev/null -p $(E2E_SSH_PORT) root@localhost '/opt/scripts/gen-bed-mesh.sh'

.PHONY: up down deploy gen-mesh clean test test-ui test-debug test-headed init help all-clean \
	build-image

build-image: ## Build the E2E testbed container image
	@echo ""
	@echo "$(BLUE)➜ Building E2E testbed image...$(NC)"
	@if [ -z "$(DOCKER)" ]; then \
		echo "$(CROSS) Error: Neither docker nor podman found in PATH"; \
		exit 1; \
	fi
	@$(ROOT_DIR)/scripts/pull-base-images.sh $(E2E_PLATFORM) Dockerfile
	@$(DOCKER) build \
		--pull=never \
		--network=host \
		$(shell $(DOCKER) image exists $(E2E_IMAGE) 2>/dev/null && echo --cache-from $(E2E_IMAGE)) \
		--platform $(E2E_PLATFORM) \
		-t $(E2E_IMAGE) \
		-f Dockerfile \
		$(ROOT_DIR)
	@echo "$(TICK) E2E testbed image built"

up: build-image ## Start the E2E testbed container
	@echo ""
	@echo "$(BLUE)➜ Starting E2E Testbed...$(NC)"
	@$(DOCKER) run --rm -d --replace \
		--name $(E2E_CONTAINER) \
		--hostname printer-testbed \
		--platform $(E2E_PLATFORM) \
		--publish $(E2E_SSH_PORT):22 \
		--publish $(E2E_HTTP_PORT):80 \
		--memory 110m \
		--memory-swap -1 \
		--health-cmd '/healthcheck.sh' \
		--health-interval 1s \
		--health-timeout 1s \
		--health-retries 5 \
		--health-start-period 2s \
		$(E2E_IMAGE)
	@printf "$(INFO) Waiting for testbed to be ready"
	@for i in $$(seq 1 30); do \
		status="$$($(DOCKER) container inspect --format '{{.State.Health.Status}}' $(E2E_CONTAINER) 2>/dev/null)"; \
		if [ "$$status" = "healthy" ]; then \
			break; \
		fi; \
		printf "."; \
		sleep 1; \
	done
	@echo ""
	@status="$$($(DOCKER) container inspect --format '{{.State.Health.Status}}' $(E2E_CONTAINER) 2>/dev/null)"; \
	if [ "$$status" != "healthy" ]; then \
		echo "$(CROSS) E2E Testbed health check failed (status: $$status)"; \
		exit 1; \
	fi
	@echo "$(TICK) E2E Testbed started successfully!"
	@echo "$(INFO) SSH access: $(BLUE)ssh -p $(E2E_SSH_PORT) root@localhost$(NC) (password: toor)"
	@echo "$(INFO) HTTP will be available at: $(BLUE)http://localhost:$(E2E_HTTP_PORT)$(NC) (after deployment)"
	@echo ""
	@echo "$(INFO) To deploy, run: $(BLUE)make deploy$(NC) (from e2e dir)"
	@echo ""

down: ## Stop and remove the E2E testbed container
	@echo ""
	@echo "$(BLUE)➜ Stopping E2E Testbed...$(NC)"
	@$(DOCKER) stop $(E2E_CONTAINER) 2>/dev/null || true
	@echo "$(TICK) E2E Testbed stopped"
	@echo ""

deploy: ## Deploy to the E2E testbed (builds first). Use E2E_DEBUG=1 for debug mode
	@echo ""
	@echo "$(BLUE)➜ Deploying to E2E Testbed...$(NC)"
	@$(MAKE) -C $(ROOT_DIR) deploy PRINTER_IP=localhost \
		PRINTER_PORT=$(E2E_SSH_PORT) PRINTER_USER=root WEBFSD_PORT=80 \
		PRINTER_PASSWORD=toor WEBFSD_DEBUG=$(E2E_DEBUG)

gen-mesh: ## Generate bed mesh points in testbed (simulates leveling)
	@echo ""
	@echo "$(BLUE)➜ Generating bed mesh in testbed...$(NC)"
	@$(E2E_GEN_MESH_CMD)
	@echo ""

clean: ## Stop testbed and remove image
	@echo ""
	@echo "$(BLUE)➜ Cleaning E2E Testbed...$(NC)"
	@$(DOCKER) stop $(E2E_CONTAINER) 2>/dev/null || true
	@$(DOCKER) rmi $(E2E_IMAGE) 2>/dev/null || true
	@rm -rf node_modules
	@rm -f $(E2E_ALL_STAMP)
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

all: $(E2E_ALL_STAMP) ## Run the full E2E pipeline: up, deploy, test, down

$(E2E_ALL_STAMP): $(E2E_SOURCES) node_modules/.playwright-installed
	@$(MAKE) up
	@$(MAKE) deploy
	@$(MAKE) test
	@$(MAKE) down
	@mkdir -p $(STAMP_DIR)
	@touch $(E2E_ALL_STAMP)
	@echo ""
	@echo "$(TICK) E2E pipeline completed"
	@echo ""

all-clean: ## Clean and re-run the full E2E pipeline
	@rm -f $(E2E_ALL_STAMP)
	@$(MAKE) all

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
