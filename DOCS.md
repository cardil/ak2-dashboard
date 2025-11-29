# AK2 Dashboard - User Guide

Comprehensive guide to using the AK2 Dashboard features.

## Table of Contents

- [Dashboard Overview](#dashboard-overview)
- [Bed Mesh Leveling](#bed-mesh-leveling)
- [Profiles System](#profiles-system)
- [3D Mesh Visualizer](#3d-mesh-visualizer)
- [System Tools](#system-tools)
- [File Browser](#file-browser)
- [Webcam](#webcam)
- [Kobra Unleashed Integration](#kobra-unleashed-integration)
- [Troubleshooting](#troubleshooting)

---

## Dashboard Overview

The main dashboard provides a comprehensive view of your printer's status and controls.

### Printer Statistics
- **Temperature** - Current and target temperatures for hotend and bed
- **Print Progress** - Real-time progress percentage and time estimates
- **Status** - Current printer state (idle, printing, paused, etc.)

### Printer Controls
- **Upload & Print** - Upload G-code files directly from your computer
- **Pause/Resume** - Control ongoing prints
- **Stop** - Cancel current print job
- **File Selection** - Browse and select files from printer storage

### Print History
View recently printed files with timestamps and reprint capability.

### Webcam Stream
Live view from your USB camera (if connected).

---

## Bed Mesh Leveling

The most powerful feature of the AK2 Dashboard is the advanced bed mesh leveling system.

### The Problem

Stock firmware's bed leveling produces inconsistent results. The same probe point can measure differently each time:
- First measurement: -0.09mm
- Second measurement: -0.06mm
- Third measurement: -0.11mm

This inconsistency leads to poor first-layer adhesion and print failures.

### The Solution: Mesh Averaging

The averaging system combines multiple leveling passes to produce a reliable, consistent mesh.

### How It Works

1. **Run Auto-Level** - Perform bed leveling from your printer as usual
2. **Save Slot** - The dashboard detects new mesh data and prompts you to save it as a "slot"
3. **Repeat** - Run leveling several more times (5-6 recommended), saving each as a new slot
4. **Calculate Average** - The system automatically computes the average of all slots
5. **Apply** - Click "Set mesh average data" to write the averaged mesh to your printer.cfg
6. **Reboot** - Restart the printer for changes to take effect

### The Math

The algorithm is simple yet effective:
```
For each probe point:
  Average = (Slot1 + Slot2 + Slot3 + ... + SlotN) / N
```

Each corresponding point from all saved slots is summed and divided by the number of slots, resulting in a statistically superior mesh that eliminates measurement noise.

### Advanced Settings

**Custom Grid Size**
- K2 Pro: Default 5×5, max 6×6
- K2 Plus/Max: Default 7×7, max 10×10
- Increase grid density for more detailed mesh data
- ⚠️ Increase by one point at a time to avoid firmware limitations

**Leveling Temperature**
- Set custom bed temperature for leveling
- Recommended to match your most common print temperature
- Accounts for thermal expansion at printing temps

**Precision**
- Set decimal precision for averaged results
- 0.01mm precision: Values <0.005 round to 0.00, ≥0.005 round to 0.01
- Experiment to find optimal settings for your printer

### Slot Management

- **Save Slots** - Up to 99 slots can be saved
- **View Specific Slot** - Enter slot number and click visualize
- **Delete Slots** - Clear specific slots or all slots
- **Automatic Numbering** - Slots are numbered automatically

### Visualization

- **Current Mesh** - View the mesh currently in printer.cfg
- **Average Mesh** - View the calculated average mesh
- **Specific Slot** - View any saved slot in 3D
- **Compare** - Compare current vs. average to see improvements

---

## Profiles System

🚧 **This feature is currently under reconstruction.** A new profiles system with isolated slot storage is being developed.

The profiles system will allow you to save complete leveling configurations for different scenarios, such as:
- Different build plates (PEI sheet, textured spring steel, glass plate)
- Different materials with varying thermal expansion requirements
- Custom configurations for specific use cases

---

## 3D Mesh Visualizer

Powered by ECharts, the visualizer provides stunning 3D representations of your bed mesh data.

### Features
- **Rotate** - Click and drag to rotate the mesh
- **Zoom** - Scroll to zoom in/out
- **Pan** - Shift+drag to pan
- **Color Coding** - Height variations shown with color gradient
- **Interactive** - Hover over points to see exact values

### What to Look For
- **High Points** - Red/warm colors indicate high spots
- **Low Points** - Blue/cool colors indicate low spots
- **Warping** - Overall bed curvature and deformation
- **Consistency** - Compare current vs. averaged mesh to see improvement

---

## System Tools

### System Control
- **Uptime** - How long the printer has been running
- **CPU Usage** - Current processor load
- **Memory** - RAM usage statistics
- **Reboot** - Restart the printer without physical access
- **Shutdown** - Power down the system gracefully

### Services
- **SSH Status** - Check if SSH is running
- **Start/Stop SSH** - Control remote terminal access
- **Security** - Manage system access

### Security
- **Change Root Password** - Update the system password remotely
- **Secure by default** - Control who has access to your printer

### Printer Log Viewer
Advanced log viewing with powerful features:

**Features**
- **Real-time Updates** - Watch logs as they happen
- **Follow Mode** - Auto-scroll to latest entries
- **Error Highlighting** - Errors in red, warnings in yellow
- **Deduplication** - Repeated messages are collapsed
- **Efficient Streaming** - HTTP Range requests for minimal bandwidth
- **Download** - Log files can be downloaded via the File Browser

**What Logs Show**
- Klipper messages
- Motion system events
- Temperature changes
- Errors and warnings
- System events

---

## File Browser

Navigate the printer's filesystem with ease.

### Features
- **Directory Navigation** - Browse folders with breadcrumb trails
- **File Preview** - Click files to view contents
- **Syntax Highlighting** - Code viewer with Prism.js
- **Binary Support** - Hex dump view for binary files
- **Download** - Save files to your computer
- **Smart Sorting** - Directories first, alphabetical order

### Supported File Types

**Code & Config** (Syntax Highlighted)
- Python (.py)
- Shell scripts (.sh)
- G-code (.gcode, .g)
- JSON (.json)
- YAML (.yaml, .yml)
- C/C++ (.c, .h, .cpp)
- JavaScript (.js)
- CSS (.css)
- And more...

**Binary Files**
- Hex dump view
- File size limit: 100KB for preview
- Larger files: download only

---

## Webcam

Real-time image streaming from a USB webcam.

### Requirements
- USB webcam connected to any printer USB port
- Camera must support MPEG or raw YUYV format
- Resolution: 640×480

### Features
- **Live Streaming** - Updated approximately 8 times per second (125ms interval)
- **Auto-refresh** - No manual refresh needed
- **Embedded Display** - View directly in dashboard

**Note:** Streaming is live images, not video. Images refresh approximately 8 times per second for minimal resource usage.

---

## Kobra Unleashed Integration

[Kobra Unleashed](https://github.com/cardil/kobra-unleashed) enables remote printer control through a web interface connected to your MQTT server.

### What You Can Do

Once configured:
- 📤 **Remote Printing** - Upload and start prints from anywhere
- 📊 **Live Monitoring** - Real-time status and statistics
- 📁 **File Management** - Browse and manage G-code files
- 🖨️ **Multi-printer** - Control multiple Kobra 2 printers
- 📋 **Print Queue** - Manage print jobs

### Installation Required

> **⚠️ Kobra Unleashed requires separate installation:**
>
> You need to set up:
> 1. MQTT server (e.g., Mosquitto)
> 2. Kobra Unleashed server
> 3. Configure printer firmware
> 4. Configure this dashboard
>
> **[📖 Complete Setup Guide](https://github.com/cardil/ak2-dashboard/blob/main/INSTALL.md#kobra-unleashed-integration)**

### Quick Configuration Check

To verify your configuration:

1. **Check if KU URL is set** - SSH into printer:
   ```bash
   ssh root@PRINTER_IP
   cat /mnt/UDISK/webfs/api/webserver.json
   ```

2. **Look for `mqtt_webui_url`:**
   ```json
   {
     "mqtt_webui_url": "http://YOUR_KU_SERVER_IP:5000"
   }
   ```

3. **Test KU server** - Visit in browser:
   ```
   http://YOUR_KU_SERVER_IP:5000
   ```

4. **Reload this dashboard** after any config changes

### Common Issues

**"Kobra Unleashed: unavailable"**
- ✅ [Check full setup guide](https://github.com/cardil/ak2-dashboard/blob/main/INSTALL.md#kobra-unleashed-integration)
- ✅ Verify KU server is running
- ✅ Check `mqtt_webui_url` in webserver.json
- ✅ Reload this page

**Printer controls not working**
- ✅ Verify MQTT server is running
- ✅ Check printer firmware MQTT settings
- ✅ Review KU server logs

### Resources

- 📖 [Installation Guide](https://github.com/cardil/ak2-dashboard/blob/main/INSTALL.md#kobra-unleashed-integration)
- 🔧 [Kobra Unleashed](https://github.com/cardil/kobra-unleashed)
- 🐛 [Report Issues](https://github.com/cardil/ak2-dashboard/issues)

---

## Troubleshooting

### Dashboard Won't Load

**Check Network Connection**
- Verify printer is connected to network
- Ping the printer IP from your computer
- Check firewall settings

**Check Port**
- Default port is 80
- Verify port in custom firmware config
- Try `http://PRINTER_IP` or `http://PRINTER_IP:80`

**Restart Webserver**
- SSH into printer
- `killall webfsd`
- `/opt/bin/webfsd` (restart manually)

### Webcam Not Working

**Verify Camera**
- USB camera connected?
- Check `lsusb` output via SSH
- Test camera: `v4l2-ctl --list-devices`

**Format Support**
- Camera must support MPEG or YUYV
- Resolution 640×480 required
- Try different USB port

### Mesh Leveling Issues

**Inconsistent Results**
- This is normal for stock firmware
- Use the averaging system (5-6 slots minimum)
- Check probe cleanliness

**Grid Size Errors**
- Increase grid by one point at a time
- K2 Pro max: 6×6
- K2 Plus/Max max: 10×10
- Larger grids may cause firmware errors

**Average Not Applied**
- Did you click "Set mesh average data"?
- Did you reboot the printer after?
- Check that "Current Mesh" matches "Average Mesh" after reboot

### File Browser Issues

**Files Not Showing**
- Verify file permissions via SSH
- Check directory exists
- Refresh page

**Preview Not Working**
- Files >100KB show download only
- Binary files show hex dump
- Unsupported formats: download only

### General Issues

**High Resource Usage**
- Normal usage: <1% memory
- CPU spikes during page load are normal
- Continuous high usage: check for errors in logs

**Lost Settings**
- Settings stored in `/mnt/UDISK/webfs`
- Check UDISK is mounted
- Settings survive reboots

**Need Help?**
- Join Telegram: [https://t.me/kobra2modding](https://t.me/kobra2modding)
- Report bugs on GitHub
- Check community discussions

---

## FAQ

**Q: Will this void my warranty?**

A: Installing custom firmware modifications may void manufacturer warranty. Use at your own risk.

**Q: Can I revert to stock firmware?**

A: Yes, you can flash stock firmware back to your printer.

**Q: Is this safe?**

A: The software is used by many community members, but as with any firmware modification, there are inherent risks. Always have a backup plan.

**Q: How often should I update?**

A: Check GitHub releases for updates and security patches. Update when new features or fixes are available.

**Q: Can I contribute?**

A: Absolutely! The project is open source and welcomes contributions. See the GitHub repository.

**Q: Does this work with all Kobra 2 models?**

A: Yes, it supports K2, K2 Pro, K2 Plus, and K2 Max.

**Q: What about Kobra 3?**

A: This project is specifically for Kobra 2 Series. Kobra 3 uses different firmware.

---

For more information, visit the [GitHub repository](https://github.com/cardil/ak2-dashboard) or join the [Telegram community](https://t.me/kobra2modding).
