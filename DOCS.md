# AK2 Dashboard - User Guide

Comprehensive guide to using the AK2 Dashboard features.

## Table of Contents

- [Dashboard Overview](#dashboard-overview)
- [Bed Mesh Leveling](#bed-mesh-leveling)
- [Profiles](#profiles)
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

The Leveling page provides advanced bed mesh management with mesh averaging and profile support.

### What the Printer Firmware Knows

The printer firmware only knows two things:
- `/user/printer.cfg` - Contains the active bed mesh and leveling settings
- `/user/unmodifiable.cfg` - Read-only system configuration

Everything else (slots, profiles, averaging) is managed by the dashboard as a layer on top.

### The Problem

Stock firmware's bed leveling produces inconsistent results. The same probe point can measure differently each time (-0.09mm, then -0.06mm, then -0.11mm). This leads to poor first-layer adhesion.

### The Solution: Mesh Averaging

Save multiple leveling passes as "slots", then apply the calculated average for a statistically superior mesh.

### Workflow

1. **Run Auto-Level** from printer's physical menu
2. **Save to slot** in the dashboard (the new mesh appears as "Active Mesh")
3. **Repeat** leveling 5-6 times, saving each to a new slot
4. **Activate the average** mesh when satisfied
5. **Reboot** the printer for changes to take effect
6. **Save as profile** to backup the configuration

### Settings

| Setting | Description | Notes |
|---------|-------------|-------|
| **Grid Size** | Probe point density (2×2 to 10×10) | K2 Pro max 6×6, K2 Plus/Max max 10×10. Changing deletes all slots. ⚠️ Increase by one point at a time to avoid firmware limitations. |
| **Bed Temp** | Temperature during leveling | Match your most common print temperature |
| **Precision** | Decimal precision for averaging | 0.01 = round to nearest 0.01mm |

### Slots

Slots store individual mesh measurements from each leveling pass. They are:
- **Dashboard-only** - The printer firmware doesn't know about them
- **Profile-specific** - Each profile (including Current) has its own isolated slots
- **Numbered 1-99** - Automatically assigned or manually specified

Each slot is stored as a `.txt` file with up to two lines:

```
+0.081000, -0.022000, ...   ← line 1: mesh CSV data
1.4430                      ← line 2: z_offset (optional)
```

Slots saved before z-offset support was added contain only line 1 (legacy format). These are fully supported — their z-offset shows as "—".

### Z-offset per Slot

Every slot row displays its z-offset value alongside the mesh data. This includes the active mesh, all saved slots, and the computed average.

- **Inline editing** — Click the z-offset value on any slot row to edit it. Press Enter or click away to save. The active slot updates `printer.cfg` immediately; saved slots update the slot file.
- **Average slot** — Z-offset is read-only and computed from all slots that have a z-offset. Legacy slots (no z-offset) are excluded from the average. If no slots have a z-offset the average shows "—".
- **Legacy slots** — Display "z: —". You can add a z-offset by clicking the label and entering a value.

### Safe Activation

When activating a slot or average as the current mesh:

- **Slot with z-offset** — Both mesh points and z-offset are written to `printer.cfg`.
- **Slot without z-offset (legacy)** — Only mesh points are updated. The existing z-offset in `printer.cfg` is preserved, preventing accidental data loss.

## Profiles

Profiles let you save and restore complete leveling configurations for different scenarios (build surfaces, materials, backups). They are dashboard-only features - the printer firmware doesn't know about them. They are snapshots you can restore later.

**Current vs. Saved Profiles**

| | Current | Saved Profile |
|---|---------|---------------|
| Location | `/user/printer.cfg` | `profiles/{id}/printer.cfg` |
| Slots | `/user/webfs/data_slot_*.txt` | `profiles/{id}/slots/` |
| Receives leveling data | ✓ Yes | ✗ No (snapshot only) |
| Changes affect printer | ✓ Immediately | ✗ Not until applied |

**Operations**
- **Create:** Save As (💾) → New Profile → Enter name
- **Rename/Delete:** Settings (⚙️) → Edit (✏️) or Delete (🗑️)
- **Apply to Printer:** Select profile → Save As → Current → Confirm reboot

**What Profiles Store**
- Grid size, bed temp, precision settings
- Active mesh data
- All saved slot measurements, including z-offset per slot

**Limitations**
- Maximum 20 profiles, 99 slots per profile
- Grid size changes delete all slots and require reboot
- Profile names must be unique (case-insensitive)

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
- `/opt/bin/webfsd-runner` (restart via wrapper script)

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

**Legacy Slots Showing "z: —"**
- Slots saved before z-offset support show "—" instead of a value
- They were saved before this feature was introduced
- To add a z-offset: click the "—" label on the slot row, enter the value, and press Enter

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
