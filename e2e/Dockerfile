# E2E Testbed Dockerfile - Simulates Tina Linux printer environment
# Tina Linux = OpenWRT + glibc 2.23 (Allwinner's custom build)
# We create a hybrid by sideloading glibc from Ubuntu 16.04 into OpenWRT rootfs
# See: https://github.com/tinalinux/docs - "Tina build system is based on OpenWrt buildsystem"

# Stage 1: Extract glibc 2.23 libraries from Ubuntu 16.04 ARM
FROM --platform=linux/arm/v7 ubuntu:16.04 AS glibc-source
# Libraries are pre-installed in base image - nothing to do

# Stage 2: OpenWRT rootfs with glibc sideloaded
FROM --platform=linux/arm_cortex-a15_neon-vfpv4 docker.io/openwrt/rootfs:armvirt-32-22.03.7 AS runtime

# Copy ALL glibc 2.23 libraries to /lib/glibc/ - keeping musl intact for OpenWRT tools
# webfsd (glibc-linked) will be invoked via the glibc dynamic linker with explicit library path
# (musl uses ld-musl-armhf.so.1, so no conflict)
COPY --from=glibc-source /lib/ld-linux-armhf.so.3 /lib/glibc/
COPY --from=glibc-source /lib/arm-linux-gnueabihf/*.so* /lib/glibc/

# Install required packages via opkg
# Note: Using dropbear for SSH - it handles scp via its internal subsystem
RUN mkdir -p /var/lock && \
    opkg update && \
    opkg install \
    dropbear \
    openssh-sftp-server \
    unzip

# Generate dropbear host keys at build time (like the real printer)
RUN mkdir -p /opt/etc/dropbear && \
    dropbearkey -t rsa -f /opt/etc/dropbear/dropbear_rsa_host_key && \
    dropbearkey -t ed25519 -f /opt/etc/dropbear/dropbear_ed25519_host_key

# Create directory structure similar to the printer
# Only directories that exist on a vanilla printer, NOT webfs dirs (those come from deploy)
RUN mkdir -p /user \
    && mkdir -p /mnt/UDISK \
    && mkdir -p /opt/bin \
    && mkdir -p /opt/etc/init.d \
    && mkdir -p /opt/scripts \
    && mkdir -p /etc/webfs/webfsd.conf.d \
    && chmod 755 /user /mnt /opt \
    && chmod 755 /mnt/UDISK

# Create the printer log file (not a directory)
RUN touch /mnt/UDISK/log

# Create root user's .ssh directory
RUN mkdir -p /root/.ssh \
    && chmod 700 /root/.ssh

# Set root password for SSH access (dropbear allows root login by default)
# OpenWRT uses passwd from busybox, not chpasswd
RUN printf 'toor\ntoor\n' | passwd root

# Copy sample config files
COPY e2e/config/printer.cfg /user/printer.cfg
COPY e2e/config/unmodifiable.cfg /user/unmodifiable.cfg

# Copy mime.types for webserver
COPY webserver/etc/mime.types /etc/mime.types

# Copy scripts
COPY e2e/scripts/entrypoint.sh /entrypoint.sh
COPY e2e/scripts/healthcheck.sh /healthcheck.sh
COPY e2e/scripts/S51dropbear /opt/etc/init.d/S51dropbear
COPY e2e/scripts/rc.local /etc/rc.local
COPY e2e/scripts/reboot /sbin/reboot
COPY e2e/scripts/poweroff /sbin/poweroff
COPY e2e/scripts/gen-bed-mesh.sh /opt/scripts/gen-bed-mesh.sh

# Copy E2E webfsd config overrides (base config comes from webserver.zip during deploy)
COPY e2e/config/webfs/webfsd.conf.d/99-e2e.conf /etc/webfs/webfsd.conf.d/99-e2e.conf
COPY e2e/config/webfs/env.d/00-glibc.env /etc/webfs/env.d/00-glibc.env

# Make scripts executable
RUN chmod +x /entrypoint.sh \
    && chmod +x /healthcheck.sh \
    && chmod +x /opt/etc/init.d/S51dropbear \
    && chmod +x /etc/rc.local \
    && chmod +x /sbin/reboot \
    && chmod +x /sbin/poweroff \
    && chmod +x /opt/scripts/gen-bed-mesh.sh

# Expose SSH and HTTP ports
EXPOSE 22 80

CMD ["/entrypoint.sh"]
