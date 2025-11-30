# E2E Testbed Dockerfile - Simulates printer environment
FROM alpine:3.19

# Install required packages
RUN apk add --no-cache \
    openssh \
    openssh-sftp-server \
    unzip \
    bash

# Create directory structure similar to the printer
RUN mkdir -p /user/webfs/profiles \
    && mkdir -p /mnt/UDISK \
    && mkdir -p /opt/webfs \
    && mkdir -p /etc/webfs \
    && chmod 755 /user /mnt /opt /etc \
    && chmod 755 /user/webfs /mnt/UDISK /opt/webfs /etc/webfs

# Create root user's .ssh directory
RUN mkdir -p /root/.ssh \
    && chmod 700 /root/.ssh

# Set root password for SSH access
RUN echo 'root:toor' | chpasswd

# Configure SSH
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

# Expose SSH and HTTP ports
EXPOSE 22 80

# Start SSH daemon
CMD ["/usr/sbin/sshd", "-D", "-e"]