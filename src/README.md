# Backend Development Guide

C-based web server for the AK2 Dashboard, built on WEBFS with custom API extensions.

## Overview

The backend is a lightweight, resource-efficient web server designed to run on the Anycubic Kobra 2's ARM processor. It combines the WEBFS static file server with custom C code for printer integration.

### Architecture

- **WEBFS Core** - Static file serving, HTTP protocol handling
- **Custom API Layer** - Printer communication, mesh processing, system tools
- **MUSL Library** - Static compilation for minimal dependencies
- **ARM Cross-compilation** - Built for printer's ARM architecture

### Resource Usage
- **Memory:** <1% of system RAM (~10-15MB total)
- **CPU:** Minimal, spikes only during requests
- **Storage:** ~2-3MB executable (stripped)

## Building from Source

### Prerequisites

The build supports two cross-compilation methods:

**Method 1: Downloaded Cross-compiler (Default, Faster)**

Download and extract MUSL cross-compiler:

```bash
cd src
make init
```

The toolchain will be downloaded to `arm-linux-musleabi-cross/` in the src directory.

**Method 2: Docker Compiler Wrapper (EXPERIMENTAL - CI Only)**

⚠️ **WARNING:** Docker method uses Alpine ARM gcc instead of musl.cc cross-compiler.
The resulting binary has NOT been tested on actual printer hardware. Use wget method for production builds.

Requires Docker or Podman with QEMU support:

```bash
cd src
USE_DOCKER=1 make init
```

This builds a Docker image with ARM gcc that wraps compiler calls. No external downloads needed (useful for CI).

### Build Commands

**Full Build (Default Method):**
```bash
make
```

**Full Build (Docker Method):**
```bash
USE_DOCKER=1 make
```

**Backend Only:**
```bash
cd src
make
```

**Backend with Docker:**
```bash
cd src
USE_DOCKER=1 make
```

**Clean Build:**
```bash
make clean
make
```

The Docker method is primarily used in CI/CD pipelines to avoid downloading from musl.cc, but produces untested binaries. **Use the default wget method for production builds.**

### Build Process

1. **Compile C Sources** - Each `.c` file compiled to `.o` object file
2. **Link Executable** - Objects linked into `webfsd` binary
3. **Strip Binary** - Debug symbols removed → `webfsd.stripped`
4. **Copy to Package** - Placed in `webserver/opt/bin/webfsd`
5. **Build Frontend** - Svelte app compiled and added to package
6. **Create Archive** - Everything packaged into `webserver.zip`

### Build Configuration

**Makefile Variables:**
```makefile
CC = arm-linux-musleabi-cross/bin/arm-linux-musleabi-gcc
CFLAGS = -O2 -Wall -static
LDFLAGS = -static
```

## Code Structure

### Source Files

**webfsd.c** - Main entry point, server initialization
- Argument parsing
- Socket setup
- Request handling loop
- Signal handling

**httpd.h** - Core HTTP definitions and structures
- HTTP status codes
- Request/response structures
- Function prototypes

**request.c** - HTTP request parsing and routing
- Parse HTTP requests
- Route to appropriate handlers
- Custom API endpoint routing

**response.c** - HTTP response generation
- Status line generation
- Header construction
- Content delivery

**api.c** - Custom API endpoints
- `/api/system` - System information and statistics
- `/api/profiles` - Profile management
- `/api/security` - Password management
- API request handling

**api.h** - API definitions and structures
- API endpoint declarations
- Data structures for API responses
- Function prototypes

**ls.c** - Directory listing functionality
- File browser backend
- Directory traversal
- File metadata

**mime.c** - MIME type detection
- File extension mapping
- Content-Type header generation

**webcam.c** - Webcam streaming
- V4L2 camera integration
- MJPEG streaming
- Image capture

**config-parser.c** - Configuration file parsing
- Read `/mnt/UDISK/webfs/api/webserver.json`
- Parse printer.cfg
- Settings management

### Key Functions

**API Handlers (api.c):**
```c
void handle_api_info(struct request *req);
void handle_api_mesh(struct request *req);
void handle_api_system(struct request *req);
void handle_api_logs(struct request *req);
```

**Request Processing (request.c):**
```c
void parse_request(struct request *req);
void route_request(struct request *req);
```

**Response Generation (response.c):**
```c
void send_response(struct request *req, int status);
void send_file(struct request *req, const char *path);
void send_json(struct request *req, const char *json);
```

## API Endpoints

### GET /api/system

Returns system information and statistics. Reads directly from /proc files for optimal performance.

**Response:**
```json
{
  "api_ver": 1,
  "total_mem": 114208768,
  "free_mem": 43442176,
  "free_mem_per": 38,
  "cpu_use": 5,
  "cpu_usr_use": 2,
  "cpu_sys_use": 3,
  "cpu_idle": 95,
  "ssh_status": 2,
  "uptime": "10:23:45"
}
```

**Fields:**
- `ssh_status`: 0=not installed, 1=stopped, 2=running
- `uptime`: HH:MM:SS format
- Memory values in bytes

### GET /api/logs

Streams printer log with optional range requests.

**Headers:**
- `Range: bytes=0-1000` - Partial content support
- `X-Follow: true` - Follow mode (tail -f behavior)

### POST /api/mesh/save

Saves current mesh to a slot.

**Request:**
```json
{
  "slot": 1
}
```

### POST /api/mesh/average

Calculates and applies average mesh.

**Request:**
```json
{
  "precision": 0.01
}
```

### POST /api/system/reboot

Reboots the printer system.

### POST /api/system/ssh

Starts or stops SSH service.

**Request:**
```json
{
  "action": "start" | "stop"
}
```

### POST /api/security/password

Changes root password.

**Request:**
```json
{
  "password": "new_password"
}
```

## Adding New Features

### Adding a New API Endpoint

1. **Define in api.h:**
```c
void handle_api_newfeature(struct request *req);
```

2. **Implement in api.c:**
```c
void handle_api_newfeature(struct request *req) {
    // Your implementation
    send_json(req, "{\"status\":\"ok\"}");
}
```

3. **Route in request.c:**
```c
if (strcmp(req->path, "/api/newfeature") == 0) {
    handle_api_newfeature(req);
    return;
}
```

4. **Update frontend** to call the new endpoint

### Reading Printer Configuration

**Example: Parse printer.cfg**
```c
FILE *fp = fopen("/mnt/UDISK/printer.cfg", "r");
if (!fp) {
    send_error(req, 500, "Cannot open printer.cfg");
    return;
}

char line[256];
while (fgets(line, sizeof(line), fp)) {
    if (strstr(line, "[bed_mesh default]")) {
        // Parse mesh data
    }
}
fclose(fp);
```

### Executing System Commands

**Example: Get system uptime**
```c
FILE *pipe = popen("uptime", "r");
if (!pipe) {
    send_error(req, 500, "Cannot execute command");
    return;
}

char result[256];
fgets(result, sizeof(result), pipe);
pclose(pipe);

// Format and send response
```

### JSON Generation

**Manual JSON (simple):**
```c
char json[1024];
snprintf(json, sizeof(json),
    "{\"status\":\"%s\",\"value\":%d}",
    status, value);
send_json(req, json);
```

**For complex JSON:** Consider adding a JSON library or use string building carefully.

## File Locations on Printer

### Runtime Locations

- **Executable:** `/opt/bin/webfsd`
- **Web Root:** `/mnt/UDISK/webfs/` (runtime)
- **Templates:** `/opt/webfs/` (original templates)
- **Config:** `/mnt/UDISK/webfs/api/webserver.json`
- **Printer Config:** `/mnt/UDISK/printer.cfg`
- **Printer Log:** `/mnt/UDISK/printer.log`

### Directory Structure
```
/opt/
  bin/webfsd           # Server executable
  webfs/               # Template files

/mnt/UDISK/
  webfs/               # Active web root
    api/               # API resources
      webserver.json   # Configuration
    index.html         # Frontend SPA
    assets/            # Frontend assets
  printer.cfg          # Klipper config
  printer.log          # Klipper log
```

## Testing

### Local Testing (Mock Environment)

Since the backend is ARM-compiled, testing on x86 requires:

1. **Use Mock Server** - Frontend includes a mock API server
2. **Test API Responses** - Verify JSON structure
3. **Cross-compile and Deploy** - Test on actual printer

### On-Printer Testing

**Deploy Test Build:**
```bash
make
scp webserver/opt/bin/webfsd root@PRINTER_IP:/tmp/webfsd-test
ssh root@PRINTER_IP
/tmp/webfsd-test -p 8001 -r /mnt/UDISK/webfs
```

**View Logs:**
```bash
ssh root@PRINTER_IP
tail -f /mnt/UDISK/printer.log
```

**Test API Endpoints:**
```bash
curl http://PRINTER_IP:8001/api/system
curl http://PRINTER_IP:8001/api/webserver.json
```

## Debugging

### Compilation Errors

**Undefined reference:**
- Check linking order in Makefile
- Ensure all required objects are linked

**Cross-compilation issues:**
- Verify MUSL toolchain is installed
- Check `CC` path in Makefile

### Runtime Errors

**Cannot open file:**
- Check file paths (absolute paths on printer)
- Verify file permissions

**Segmentation fault:**
- Check pointer validity
- Verify buffer sizes
- Use bounds checking

**Memory leaks:**
- Always free allocated memory
- Close file handles
- Clean up resources

### Useful Debugging Techniques

**Add Logging:**
```c
fprintf(stderr, "Debug: variable = %d\n", var);
```

**Check Return Values:**
```c
FILE *fp = fopen(path, "r");
if (!fp) {
    fprintf(stderr, "Error opening %s: %s\n", path, strerror(errno));
    return;
}
```

**Valgrind (on x86 build):**
```bash
# Build for x86 first
gcc -g -o webfsd *.c
valgrind --leak-check=full ./webfsd
```

## Performance Optimization

### Memory Management

- **Static Buffers** - Pre-allocate fixed-size buffers
- **Minimal Allocations** - Reduce malloc/free calls
- **Resource Cleanup** - Always free resources after use

### CPU Efficiency

- **Avoid Polling** - Use event-driven I/O where possible
- **Cache Results** - Cache frequently accessed data
- **Optimize Loops** - Minimize iterations and computations

### Code Size

- **Compiler Flags** - Use `-O2` for optimization
- **Strip Binary** - Remove debug symbols for production
- **Static Linking** - MUSL provides minimal static library

## Security Considerations

### Input Validation

Always validate user input:
```c
if (strlen(input) > MAX_LEN) {
    send_error(req, 400, "Input too long");
    return;
}
```

### Path Traversal Prevention

Prevent directory traversal attacks:
```c
if (strstr(path, "..") || strstr(path, "~")) {
    send_error(req, 403, "Forbidden");
    return;
}
```

### Command Injection Prevention

Sanitize inputs before executing commands:
```c
// Never do this:
sprintf(cmd, "echo %s", user_input);

// Instead, validate and whitelist:
if (!is_safe_input(user_input)) {
    send_error(req, 400, "Invalid input");
    return;
}
```

## Contributing

When contributing backend code:

1. **Follow C Best Practices** - Clean, readable code
2. **Check Return Values** - Handle errors properly
3. **Test Thoroughly** - Test on actual printer
4. **Document APIs** - Update this README with new endpoints
5. **Memory Safety** - No leaks, no buffer overflows
6. **Performance** - Keep resource usage minimal

## Resources

- **WEBFS Documentation:** [https://linux.bytesex.org/misc/webfs.html](https://linux.bytesex.org/misc/webfs.html)
- **MUSL libc:** [https://musl.libc.org/](https://musl.libc.org/)
- **ARM GCC:** [https://gcc.gnu.org/](https://gcc.gnu.org/)
- **HTTP/1.1 Spec:** [https://www.rfc-editor.org/rfc/rfc2616](https://www.rfc-editor.org/rfc/rfc2616)

---

For frontend development, see [frontend/README.md](../frontend/README.md).
