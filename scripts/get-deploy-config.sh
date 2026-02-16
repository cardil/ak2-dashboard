#!/bin/bash
# Script to get deployment configuration for printer
# Reuses config directory from kobra2-fw-tools for consistency

set -e

# Config directory (same as kobra2-fw-tools)
configdir="${HOME}/.config/kobra2"
ssh_cfg="${configdir}/ssh.cfg"

# Default values
ip='192.168.1.242'
username='root'
port='22'
webfsd_port='80'

# Ensure config directory exists
mkdir -p "$configdir"

# Read existing config if available
saved_ip=""
saved_username=""
saved_port=""

if [ -f "$ssh_cfg" ]; then
    saved_ip="$(cut -d: -f1 < "$ssh_cfg")"
    saved_username="$(cut -d: -f2 < "$ssh_cfg")"
    saved_port="$(cut -d: -f3 < "$ssh_cfg")"
    
    # Use saved values if not empty
    [ -n "$saved_ip" ] && ip="$saved_ip"
    [ -n "$saved_username" ] && username="$saved_username"
    [ -n "$saved_port" ] && port="$saved_port"
fi

# Interactive mode - prompt for values using dialog
if [ "${INTERACTIVE:-yes}" = "yes" ]; then
    # Prompt for IP
    ip="$(dialog --keep-tite --stdout --inputbox 'Printer IP' 10 40 "$ip")"
    
    # Prompt for username
    username="$(dialog --keep-tite --stdout --inputbox 'SSH Username' 10 40 "$username")"
    
    # Prompt for SSH port
    port="$(dialog --keep-tite --stdout --inputbox 'SSH Port' 10 40 "$port")"
    
    # Prompt for webserver port
    webfsd_port="$(dialog --keep-tite --stdout --inputbox 'Webserver Port' 10 40 "$webfsd_port")"
    
    # Validate that required fields are not empty
    if [ -z "$ip" ] || [ -z "$username" ] || [ -z "$port" ]; then
        echo "Error: Required configuration values cannot be empty" >&2
        exit 1
    fi
    
    # Only save if configuration has changed
    if [ "$ip:$username:$port" != "$saved_ip:$saved_username:$saved_port" ]; then
        echo "$ip:$username:$port" > "$ssh_cfg"
        echo "Configuration saved to: $ssh_cfg" >&2
    fi
fi

# Export values for use by caller
export PRINTER_IP="$ip"
export PRINTER_USER="$username"
export PRINTER_PORT="$port"
export WEBFSD_PORT="$webfsd_port"

# Output values (for sourcing in Makefile)
echo "PRINTER_IP=$PRINTER_IP"
echo "PRINTER_USER=$PRINTER_USER"
echo "PRINTER_PORT=$PRINTER_PORT"
echo "WEBFSD_PORT=$WEBFSD_PORT"
