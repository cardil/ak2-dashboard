# ARM compiler for webfsd cross-compilation with glibc
# Uses Debian Jessie (glibc 2.19) - backward compatible with printer's glibc 2.23
# Native ARM gcc via QEMU emulation
#
# Note: Debian Jessie is EOL (2020) but safe for compiler-only use
# Built binaries use dynamic linking with glibc, enabling backtrace() support
# Printer already has glibc 2.23 loaded, so this shares memory instead of bundling musl

FROM --platform=linux/arm/v7 debian:jessie

# Install build tools
# Note: Debian Jessie repos are archived, GPG keys expired, need --force-yes
RUN echo "deb http://archive.debian.org/debian/ jessie main" > /etc/apt/sources.list && \
    echo "deb http://archive.debian.org/debian-security/ jessie/updates main" >> /etc/apt/sources.list && \
    apt-get update && apt-get install -y --force-yes --no-install-recommends \
    gcc \
    libc6-dev \
    binutils \
    make \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /src

# Container is used as compiler/strip wrapper via docker run
# No default command - commands are passed via docker run
ENTRYPOINT []
CMD ["/bin/sh"]
