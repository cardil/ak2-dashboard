#!/bin/sh
# DEPRECATED: This script is deprecated and will be removed in a future version.
# Please use 'make' instead.

# Define colors for the warning message
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

printf "${YELLOW}⚠ DEPRECATION WARNING:${NC}\\n"
printf "  This script (build.sh) is deprecated and will be removed in a future version.\\n"
printf "  Please use the 'make' command instead.\\n"
printf "  Running 'make' for you now...\\n\\n"

make
