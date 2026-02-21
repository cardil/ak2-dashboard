#!/bin/sh
# E2E Testbed health check script
# Verifies that dropbear SSH server is running and listening on port 22

# Check if dropbear is listening on port 22
if netstat -nlpt 2>/dev/null | grep -q ':22 '; then
    exit 0
fi

exit 1
