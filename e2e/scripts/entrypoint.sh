#!/bin/sh
# SPDX-License-Identifier: Apache-2.0
# SPDX-FileCopyrightText: 2024-2026 Chris Suszynski (@cardil)
# E2E Testbed entrypoint script
# Starts services and handles signals properly for graceful shutdown

# Cleanup function for graceful shutdown
cleanup() {
    echo "Shutting down services..."
    /opt/etc/init.d/S51dropbear stop
    exit 0
}

# Trap TERM and INT signals
trap cleanup TERM INT

# Start services
/etc/rc.local &
/opt/etc/init.d/S51dropbear start

# Keep container running and wait for signals
while true; do
    sleep 1
done
