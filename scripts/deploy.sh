#!/bin/bash
# Deploy webserver to printer via SSH

set -e

# Resolve script and repository directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Define colors and icons for output
ESC=$(printf '\033')
BLUE="${ESC}[38;2;30;144;255m"
GREEN="${ESC}[0;32m"
YELLOW="${ESC}[1;33m"
RED="${ESC}[0;31m"
NC="${ESC}[0m"
TICK="${GREEN}✔${NC}"
CROSS="${RED}✖${NC}"
INFO="${BLUE}ℹ${NC}"
WARN="${YELLOW}⚠${NC}"

echo ""

# Load configuration from script or use command-line parameters
if [ -z "$PRINTER_IP" ]; then
    echo "${INFO} Loading deployment configuration..."
    # Auto-detect interactive mode based on TTY availability
    if [ -t 0 ] && [ -t 1 ]; then
        INTERACTIVE=yes
    else
        INTERACTIVE=no
    fi
    eval "$(INTERACTIVE=$INTERACTIVE "$SCRIPT_DIR/get-deploy-config.sh")" || exit 1
    
    # Validate configuration was loaded
    if [ -z "$PRINTER_IP" ] || [ -z "$PRINTER_USER" ] || [ -z "$PRINTER_PORT" ] || [ -z "$WEBFSD_PORT" ]; then
        echo "${CROSS} Configuration loading failed or was cancelled" >&2
        exit 1
    fi
else
    echo "${INFO} Using command-line parameters..."
    export PRINTER_IP="${PRINTER_IP}"
    export PRINTER_USER="${PRINTER_USER:-root}"
    export PRINTER_PORT="${PRINTER_PORT:-22}"
    export WEBFSD_PORT="${WEBFSD_PORT:-80}"
fi

echo ""
echo "${BLUE}➜ Deploying to ${PRINTER_USER}@${PRINTER_IP}:${PRINTER_PORT}...${NC}"
echo "${INFO} Webserver will run on port ${WEBFSD_PORT}"
echo "${WARN} Prerequisites: SSH access, unzip, openssh-sftp-server installed on printer"
echo "${INFO} Install with: opkg update && opkg install unzip openssh-sftp-server"
echo ""

# Upload package
echo "${INFO} Uploading package..."

# Setup SSH options for E2E testbed
SSH_OPTS=""
if [ -n "${PRINTER_PASSWORD}" ]; then
    # Use sshpass for password authentication (E2E testbed)
    SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
    export SSHPASS="${PRINTER_PASSWORD}"
    SCP_CMD="sshpass -e scp ${SSH_OPTS}"
    SSH_CMD="sshpass -e ssh ${SSH_OPTS}"
else
    # Use normal SSH (real printer)
    SCP_CMD="scp"
    SSH_CMD="ssh"
fi

if ! ${SCP_CMD} -P "${PRINTER_PORT}" "$REPO_ROOT/webserver/webserver.zip" "${PRINTER_USER}@${PRINTER_IP}:/webserver.zip"; then
    echo "${CROSS} Upload failed. Ensure openssh-sftp-server is installed."
    exit 1
fi
echo "${TICK} Package uploaded"

# Install and restart webserver
echo "${INFO} Installing and restarting webserver..."

# Handle debug mode via WEBFSD_DEBUG env var
WEBFSD_DEBUG="${WEBFSD_DEBUG:-}"

if ! ${SSH_CMD} -p "${PRINTER_PORT}" "${PRINTER_USER}@${PRINTER_IP}" "
    cd / &&
    rm -rf /opt/webfs &&
    unzip -o webserver.zip &&
    rm -f webserver.zip &&
    
    # Update port in config if different from default
    if ! grep -q '^-p ${WEBFSD_PORT}\$' /etc/webfsd/webfsd.conf 2>/dev/null; then
        sed -i 's/^-p [0-9]*\$/-p ${WEBFSD_PORT}/' /etc/webfsd/webfsd.conf
    fi &&
    
    # Pass WEBFSD_DEBUG to runner (one-off debug mode)
    WEBFSD_DEBUG='${WEBFSD_DEBUG}' /opt/bin/webfsd-runner
"; then
    echo "${CROSS} Deployment failed. Check prerequisites."
    exit 1
fi

echo "${TICK} Deployment complete"
echo ""
echo "${GREEN}✓ Dashboard deployed successfully!${NC}"
echo "${INFO} Access at: ${BLUE}http://${PRINTER_IP}:${WEBFSD_PORT}${NC}"