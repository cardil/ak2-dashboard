# Installation Guide

Complete installation instructions for the AK2 Dashboard.

## Prerequisites

> [!WARNING]
> **Jailbroken Printer Required**
>
> This dashboard requires a jailbroken Kobra 2 Series printer (Pro, Plus, or Max) with SSH access.

---

## Installation Paths

Choose your path based on your printer's current state:

### Path A: Already Jailbroken ✅

If your printer already has:
- Custom firmware with SSH enabled
- Root access configured
- SWUpdate certificates replaced

**Quick Deployment:**

If you have `unzip` and `openssh-sftp-server` installed on your printer:

```bash
# Clone this repository
git clone https://github.com/cardil/ak2-dashboard
cd ak2-dashboard

# Interactive deployment (recommended - prompts for configuration)
make deploy

# Or specify parameters directly
make deploy PRINTER_IP=192.168.1.100
```

The interactive deployment will:
- Prompt for printer IP, SSH username, port, and webserver port
- Save configuration to `~/.config/kobra2/ssh.cfg` (shared with kobra2-fw-tools)
- Reuse saved values as defaults for next deployment

**Command-line Parameters:**

You can still override any parameter via command line:

```bash
# All parameters
make deploy PRINTER_IP=192.168.1.100 PRINTER_USER=root PRINTER_PORT=22 WEBFSD_PORT=80

# Or override specific values
make deploy PRINTER_IP=192.168.1.50 WEBFSD_PORT=80
```

**Prerequisites on Printer:**

If not already installed:

```bash
ssh root@PRINTER_IP
opkg update
opkg install unzip openssh-sftp-server
```

**Alternative:** Follow **Path B** below to rebuild your complete custom firmware with the latest webserver version.

---

### Path B: New Installation 🔧

Complete jailbreak and custom firmware installation from scratch.

> [!NOTE]
> **AK2 Dashboard Included by Default**
>
> The [kobra2-fw-tools](https://github.com/cardil/kobra2-fw-tools) project provides complete jailbreak and custom firmware building tools. The AK2 Dashboard is included by default in custom firmware built with these tools.

**Basic Procedure:**

1. 🔌 **U-Boot Access via UART** - Connect USB-to-UART adapter to gain boot-level access
2. 💾 **Backup eMMC** - Create a complete backup before making changes
3. 🔑 **Gain ROOT Access** - Set root password and enable root login
4. 🌐 **Install SSH** - Enable remote access to the printer
5. 🔐 **Replace SWUpdate Certificates** - Allow custom firmware updates
6. ⚙️ **Build and Flash Custom Firmware** - Create and install your custom firmware

**Complete Documentation:**

Follow the comprehensive guides in [kobra2-fw-tools](https://github.com/cardil/kobra2-fw-tools):
- [UART Setup Guide](https://github.com/cardil/kobra2-fw-tools/blob/main/docs/UART.md)
- [ROOT Access Guide](https://github.com/cardil/kobra2-fw-tools/blob/main/docs/ROOT.md)
- [eMMC Backup Guide](https://github.com/cardil/kobra2-fw-tools/blob/main/docs/EMMC_BACKUP.md)
- [Complete Options Reference](https://github.com/cardil/kobra2-fw-tools/blob/main/docs/OPTIONS.md)

**After Flashing:**

Once the custom firmware is installed and the printer reboots:

1. Find your printer's IP address (check router's DHCP leases or printer's network settings)
2. Open your browser to `http://PRINTER_IP` (default port :80)
3. The AK2 Dashboard is already installed and ready to use!

> [!TIP]
> The webserver is enabled by default on port 80 in kobra2-fw-tools custom firmware. No additional installation steps are needed.

> [!IMPORTANT]
> **Firmware Security Best Practices**
>
> - 🔒 **Change default password** - Don't use `toor` in production
> - 💾 **Backup important files** - Always backup `/user` directory before modifications
> - 📦 **Keep firmware accessible** - Save your working custom firmware files

---

## Updating the Webserver

To update to the latest webserver version:

### Option 1: Rebuild Firmware

```bash
cd kobra2-fw-tools
# Pull latest changes
git pull

# The build script will fetch the latest webserver
./build.sh

# Flash update/update.swu as before
```

### Option 2: Deploy via Make (Recommended)

```bash
# Build and deploy in one step
cd ak2-dashboard
make deploy

# The deploy command will prompt for configuration if not already set
```

### Option 3: Manual Update (SSH Required)

```bash
# Build the webserver package
cd ak2-dashboard
make

# Copy to printer
scp webserver/webserver.zip root@PRINTER_IP:/tmp/

# SSH into printer
ssh root@PRINTER_IP

# Extract and install
cd /tmp
unzip webserver.zip
cp -r opt/* /opt/
cp -r mnt/* /mnt/

# Restart webserver
/opt/bin/webfsd-runner
```

---

## Troubleshooting

### Dashboard Won't Load

**Check network:**
```bash
ping YOUR_PRINTER_IP
```

**Check if webserver is running:**
```bash
ssh root@PRINTER_IP
ps | grep webfsd
```

**Restart webserver manually:**
```bash
ssh root@PRINTER_IP
/opt/bin/webfsd-runner
```

### Can't Access via SSH

- Verify SSH was enabled in `options.cfg`
- Check if SSH is running: `ps | grep dropbear`
- Ensure you're using the correct root password
- Try default password: `toor` (if you didn't change it)

### Firmware Update Fails

- Verify USB drive is FAT32 formatted
- Ensure `update.swu` is in a folder named `update`
- Check file isn't corrupted (re-download/rebuild)
- For partition >4GB issues, create smaller partition

### Lost Root Access After Update

> [!CAUTION]
> If you flash stock Anycubic firmware, you'll lose root access.

To regain access:
- Restore from [eMMC backup](https://github.com/cardil/kobra2-fw-tools/blob/main/docs/EMMC_RESTORE.md), or
- Repeat the jailbreak process

---

## Getting Help

**Community Support:**
- 💬 [Telegram Group](https://t.me/kobra2modding)
- 📖 [Klipper Discourse Thread](https://klipper.discourse.group/t/printer-cfg-for-anycubic-kobra-2-plus-pro-max/11658) (archived)
- 🐛 [GitHub Issues](https://github.com/cardil/ak2-dashboard/issues)

**Documentation:**
- [kobra2-fw-tools](https://github.com/cardil/kobra2-fw-tools) - Jailbreak and firmware tools
- [Kobra 2 Pro Insights](https://1coderookie.github.io/Kobra2ProInsights) - Comprehensive printer documentation

**Alternative Solutions:**
- [Rinkhals](https://jbatonnet.github.io/Rinkhals) - Modern alternative for Kobra 3 and some K2 Pro units with newer boards

---

## Kobra Unleashed Integration

[Kobra Unleashed](https://github.com/cardil/kobra-unleashed) enables remote printer control through a web interface and API connected to your MQTT server.

### Architecture

```
      Printer    ──MQTT──>   MQTT Server  <──MQTT──  Kobra Unleashed
(custom firmware)            (Mosquitto)                (Web API)
                                                            ↑
                                                            │
                                                      AK2 Dashboard
                                                        (Browser)
```

### Prerequisites

- **MQTT Server** - Self-hosted message broker (e.g., Mosquitto)
- **Server Hardware** - Raspberry Pi, homelab server, or always-on computer
- **Network Access** - Printer and KU server on same network

### Setup Steps

#### 1. Install MQTT Server (Mosquitto)

On your server (Raspberry Pi, homelab, etc.):

```bash
# Debian/Ubuntu/Raspberry Pi OS
sudo apt update
sudo apt install mosquitto mosquitto-clients

# Start and enable service
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

Configure Mosquitto (optional authentication):
```bash
sudo vi /etc/mosquitto/mosquitto.conf
```

#### 2. Configure Printer Firmware for MQTT

In your custom firmware `options.cfg`:
```bash
mqtt_server="YOUR_MQTT_SERVER_IP"
mqtt_port="1883"
```

Build and flash the custom firmware with these settings.

#### 3. Install Kobra Unleashed

On your server:

```bash
# Clone repository
git clone https://github.com/cardil/kobra-unleashed
cd kobra-unleashed

# Install dependencies
pip3 install -r requirements.txt

# Configure
cp config.example.json config.json
vi config.json
```

Set your MQTT server:
```json
{
  "mqtt_broker": "YOUR_MQTT_SERVER_IP",
  "mqtt_port": 1883,
  "web_port": 5000
}
```

Start Kobra Unleashed:
```bash
python3 main.py
```

#### 4. Configure AK2 Dashboard

SSH into your printer:
```bash
ssh root@PRINTER_IP
vi /mnt/UDISK/webfs/api/webserver.json
```

Add Kobra Unleashed URL:
```json
{
  "printer_model": "K2Pro",
  "update_version": "3.1.0",
  "mqtt_webui_url": "http://YOUR_KU_SERVER_IP:5000"
}
```

#### 5. Verify

1. Access KU directly: `http://YOUR_KU_SERVER_IP:5000`
2. Access AK2 Dashboard: `http://PRINTER_IP`
3. Check "Kobra Unleashed" link in dashboard navigation
4. Verify printer controls work

### Troubleshooting

**Printer not connecting to MQTT**
- Check MQTT server is running: `systemctl status mosquitto`
- Verify network connectivity
- Check printer firmware MQTT settings
- View MQTT logs: `sudo journalctl -u mosquitto -f`

**KU cannot connect to MQTT**
- Verify `mqtt_broker` in KU config.json
- Check MQTT server logs for connection attempts
- Test MQTT connection: `mosquitto_sub -h YOUR_MQTT_SERVER_IP -t '#'`

**Dashboard cannot connect to KU**
- Verify `mqtt_webui_url` in webserver.json
- Check KU is running: `http://YOUR_KU_SERVER_IP:5000`
- Verify firewall allows port 5000

---

## Security Notes

> [!IMPORTANT]
> **AK2 Dashboard Security**
>
> **Default (No Authentication):**
> - Suitable for trusted home networks
> - All features accessible without password
>
> **HTTP Basic Authentication (Enterprise/Campus):**
> - Add `-b user:pass` to `/etc/webfs/webfsd.conf` and restart via `webfsd-runner`
> - Example entry in `webfsd.conf`: `-b admin:securepass`
> - Protects ALL content: static files, API endpoints, and dashboard features
> - Authentication check happens before ANY request processing
>
> **Kobra Unleashed API:**
> - ⚠️ **NO authentication mechanism available**
> - Wide open by default (CORS: `*`)
> - Anyone on network can upload files and control printer
> - **Recommendation:** Use firewall rules to restrict access

**Network Security Best Practices:**
- Run on isolated/trusted networks only (default)
- Use firewall rules to limit access by IP
- Consider VPN for remote access
- For basic auth, use strong passwords

---

## Legal Notice

> [!WARNING]
> **Disclaimer**
>
> This project is not affiliated with or endorsed by Anycubic. Use at your own risk. Modifying firmware may void your warranty.

> [!NOTE]
> **Firmware Distribution**
>
> This project does NOT host or distribute firmware files. All firmware comes from Anycubic's official sources, downloaded legally via the [kobra2-fw-tools](https://github.com/cardil/kobra2-fw-tools) scripts. The custom firmware process uses Anycubic's official firmware files, downloaded from their public servers. No proprietary firmware is distributed by this project.
