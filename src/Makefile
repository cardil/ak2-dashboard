# --- Backend Makefile ---

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

# Docker/Podman configuration for glibc cross-compilation
DOCKER := $(shell command -v podman 2>/dev/null || command -v docker 2>/dev/null)
DOCKER_IMAGE := localhost/arm-cross-cc
DOCKER_PLATFORM := linux/arm/v7

# JSON library configuration
JSMN_DIR := ./vendor/jsmn
JSMN_REPO := https://github.com/zserge/jsmn.git
JSMN_HEADER := $(JSMN_DIR)/jsmn.h

# Compiler flags for glibc build with backtrace support
CFLAGS := -DMIMEFILE=\""/etc/mime.types"\" \
	-DWEBFS_VERSION=\"1.22\" \
	-D_GNU_SOURCE \
	-D_LARGEFILE_SOURCE \
	-D_LARGEFILE64_SOURCE \
	-D_FILE_OFFSET_BITS=64 \
	-I$(JSMN_DIR) \
	-g \
	-funwind-tables \
	-fno-omit-frame-pointer \
	-std=gnu99 \
	-MMD -MP
# Dynamic linking with glibc (printer already has glibc 2.23 loaded)
LDFLAGS := -rdynamic -lm -lpthread

# Docker method: wrap compiler in container
DOCKER_RUN = $(DOCKER) run --rm \
	--platform $(DOCKER_PLATFORM) \
	-v "$(CURDIR):/src:Z" \
	-w /src \
	$(DOCKER_IMAGE)
CC = $(DOCKER_RUN) gcc

SOURCE_FILES := $(wildcard *.c *.h api/*.c api/*.h)
OBJ := $(patsubst %.c,%.o,$(wildcard *.c)) $(patsubst %.c,%.o,$(wildcard api/*.c))
DEPS := $(OBJ:.o=.d)
TARGET := webfsd
TARGET_DIR := ../webserver/opt/bin
TARGET_PATH := $(TARGET_DIR)/$(TARGET)
STAMP_DIR := ../.stamps
LINT_STAMP := $(STAMP_DIR)/.lint.stamp

.PHONY: all init build lint compile test clean help \
	build-only lint-only compile-only test-only \
	export-bin docker-image clean-docker jsmn clean-jsmn

all: build ## Default target (same as build)

init: docker-image jsmn ## Initialize backend with Docker/Podman

jsmn: $(JSMN_HEADER) ## Download jsmn JSON library

$(JSMN_HEADER):
	@echo "$(BLUE)➜ Downloading jsmn JSON library...$(NC)"
	@mkdir -p vendor
	@if [ ! -d "$(JSMN_DIR)" ]; then \
		git clone --depth 1 $(JSMN_REPO) $(JSMN_DIR); \
	fi
	@echo "$(TICK) jsmn library ready."

docker-image: ## Build container image for cross-compilation
	@echo "$(BLUE)➜ Building container image...$(NC)"
	@if [ -z "$(DOCKER)" ]; then \
		echo "$(CROSS) Error: Neither docker nor podman found in PATH"; \
		exit 1; \
	fi
	@$(CURDIR)/../scripts/pull-base-images.sh $(DOCKER_PLATFORM) build.Dockerfile
	@$(DOCKER) build \
		--pull=never \
		$(shell $(DOCKER) image exists $(DOCKER_IMAGE) 2>/dev/null && echo --cache-from $(DOCKER_IMAGE)) \
		--platform $(DOCKER_PLATFORM) \
		-t $(DOCKER_IMAGE) \
		-f build.Dockerfile .
	@echo "$(TICK) Container image built"

docker-build: docker-image ## Build using container (cross-compile for ARM)
	@echo "$(BLUE)➜ Building in container...$(NC)"
	@$(DOCKER) run --rm --platform $(DOCKER_PLATFORM) \
		-v "$(CURDIR)/..:/workspace:Z" \
		-w /workspace/src \
		$(DOCKER_IMAGE)
	@echo "$(TICK) Container build complete"

$(TARGET): $(OBJ)
	@echo "$(BLUE)➜ Linking $@...$(NC)"
	@$(CC) $(LDFLAGS) -o $@ $^
	@echo "$(TICK) $@ linked (with debug symbols for backtrace support)."

test: compile ## Test the code (runs also: compile, init)

lint: init lint-only ## Lint the sources (runs also: init)

lint-only: $(LINT_STAMP) ## Lint the sources

$(LINT_STAMP): $(SOURCE_FILES)
	@echo "$(BLUE)➜ Checking sources with editorconfig-checker...$(NC)"
	@npx --yes editorconfig-checker || (echo "$(WARN) Some files don't match EditorConfig. Run 'make lint-fix' to see details." && exit 1)
	@echo "$(TICK) Sources match EditorConfig."
	@mkdir -p $(STAMP_DIR)
	@touch $(LINT_STAMP)

compile-only: $(TARGET) ## Compile the sources
compile: lint compile-only ## Compile the sources (runs also: init)

%.o: %.c
	@echo "$(BLUE)➜ Compiling $@...$(NC)"
	@$(CC) $(CFLAGS) -c $< -o $@

# Include auto-generated header dependencies (produced by -MMD -MP)
-include $(DEPS)

export-bin: $(TARGET) $(TARGET_PATH) ## Export the binary

$(TARGET_PATH): $(TARGET)
	@echo "$(BLUE)➜ Exporting binary to $(TARGET_DIR)...$(NC)"
	@mkdir -p $(TARGET_DIR)
	cp -f $(TARGET) $@
	@echo "$(TICK) $(TARGET) exported."

build-only: export-bin ## Build the backend (runs: export-bin)
build: compile build-only ## Build the backend (runs also: init, compile)

clean: ## Clean the backend
	@echo "$(BLUE)➜ Cleaning backend...$(NC)"
	rm -f $(OBJ) \
		$(DEPS) \
		$(TARGET) \
		$(TARGET_PATH) \
		$(LINT_STAMP)
	rm -rf $(STAMP_DIR)

clean-jsmn: ## Delete the jsmn library
	@echo "$(BLUE)➜ Cleaning jsmn library...$(NC)"
	rm -rf $(JSMN_DIR)

clean-docker: ## Remove container image
	@echo "$(BLUE)➜ Removing container image...$(NC)"
	@$(DOCKER) rmi $(DOCKER_IMAGE) 2>/dev/null || true

help: ## Display this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

.DEFAULT_GOAL := all
