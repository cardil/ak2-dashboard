# E2E Testbed Dockerfile - Simulates printer environment
FROM docker.io/library/alpine:3.19

# Install required packages
RUN apk add --no-cache \
    openssh \
    openssh-sftp-server \
    dropbear \
    unzip \
    bash \
    supervisor

# Create directory structure similar to the printer
# Only directories that exist on a vanilla printer, NOT webfs dirs (those come from deploy)
RUN mkdir -p /user \
    && mkdir -p /mnt/UDISK \
    && mkdir -p /opt/bin \
    && mkdir -p /opt/etc/init.d \
    && mkdir -p /opt/scripts \
    && mkdir -p /etc/webfsd/webfsd.conf.d \
    && chmod 755 /user /mnt /opt \
    && chmod 755 /mnt/UDISK

# Create the printer log file (not a directory)
RUN touch /mnt/UDISK/log

# Create root user's .ssh directory
RUN mkdir -p /root/.ssh \
    && chmod 700 /root/.ssh

# Set root password for SSH access
RUN echo 'root:toor' | chpasswd

# Configure SSH (for deployment via sshd)
RUN sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Copy persistent SSH host keys
COPY e2e/config/ssh/ssh_host_* /etc/ssh/
RUN chmod 600 /etc/ssh/ssh_host_*_key && chmod 644 /etc/ssh/ssh_host_*_key.pub

# Copy sample config files
COPY e2e/config/printer.cfg /user/printer.cfg
COPY e2e/config/unmodifiable.cfg /user/unmodifiable.cfg

# Copy mime.types for webserver
COPY webserver/etc/mime.types /etc/mime.types

# Copy scripts
COPY e2e/scripts/S51dropbear /opt/etc/init.d/S51dropbear
COPY e2e/scripts/rc.local /etc/rc.local
COPY e2e/scripts/reboot /sbin/reboot
COPY e2e/scripts/poweroff /sbin/poweroff
COPY e2e/scripts/supervisord.conf /etc/supervisord.conf
COPY e2e/scripts/gen-bed-mesh.sh /opt/scripts/gen-bed-mesh.sh

# Copy E2E webfsd override (base config comes from webserver.zip during deploy)
COPY e2e/config/webfsd/webfsd.conf.d/99-e2e.conf /etc/webfsd/webfsd.conf.d/99-e2e.conf

# Make scripts executable
RUN chmod +x /opt/etc/init.d/S51dropbear \
    && chmod +x /etc/rc.local \
    && chmod +x /sbin/reboot \
    && chmod +x /sbin/poweroff \
    && chmod +x /opt/scripts/gen-bed-mesh.sh

# Expose SSH and HTTP ports
EXPOSE 22 80

# Start with supervisord to manage services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]