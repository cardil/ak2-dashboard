#include <ctype.h>
#include <errno.h>
#include <fcntl.h>
#include <math.h>
#include <netinet/in.h>
#include <pwd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/sysinfo.h>
#include <sys/time.h>
#include <sys/types.h>
#include <syslog.h>
#include <time.h>
#include <unistd.h>
#include <pthread.h>

#include "api.h"
#include "httpd.h"

typedef uint8_t BYTE;
typedef uint16_t WORD;
typedef uint32_t DWORD;
typedef uint64_t QWORD;
typedef int8_t S8;
typedef uint8_t U8;
typedef uint16_t U16;
typedef int16_t S16;
typedef uint32_t U32;
typedef int32_t S32;
typedef uint64_t U64;
typedef int64_t S64;

const BYTE GRID[] = {
    0,
    1,
    0,
    0,
    2,  // 4
    0,
    0,
    0,
    0,
    3,  // 9
    0,
    0,
    0,
    0,
    0,
    0,
    4,  // 16
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    5,  // 25
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    6,  // 36
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    7,  // 49
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    8,  // 64
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    9,  // 81
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    10,  // 100
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    11,  // 121
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    12,  // 144
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0};

#define SYSTEM_BUFFER_MAX 1024
char system_buffer[SYSTEM_BUFFER_MAX];

int system_with_output(const char *cmd, int line_number) {
    FILE *fp;
    int n = 0;

    /* Open the command for reading. */
    fp = popen(cmd, "r");
    if (fp == NULL) {
        return 1;
    }
    /* Read the output a line at a time - output it. */
    while (fgets(system_buffer, SYSTEM_BUFFER_MAX, fp) != NULL) {
        if (debug) {
            LOG( "+++ system: %s\n", system_buffer);
        }
        n++;
        if (n == line_number)
            break;
    }
    /* close */
    pclose(fp);
    return 0;
}

U32 file_lenght(const char *fname) {
    struct stat st;
    if (access(fname, F_OK) != -1) {
        stat(fname, &st);
        return (U32)st.st_size;
    } else {
        return 0;
    }
}

#define COPY_BUF_SIZE 4096

// if buffer==NULL then do not copy the string at the end of the source file
// if from==NULL then skip copy the source file
// if to==NULL then do nothing
// mode="wb" for creating a new dest file, or "ab" for appending to the destination file
int custom_copy_file(const char *from, const char *to, const char *mode, const char *buffer) {
    FILE *src, *dst;
    size_t in, out;
    if (!to)
        return 0;  // nothing to do
    char *buf = (char *)malloc(COPY_BUF_SIZE * sizeof(char));
    if (!buf)
        return -1;
    dst = fopen(to, mode);  // "wb" or "ab"
    if (dst < 0) {
        free(buf);
        return -2;
    }
    if (from) {
        // need to copy a source file
        src = fopen(from, "rb");
        if (NULL == src) {
            fflush(dst);
            fclose(dst);
            free(buf);
            return -3;
        }
        while (1) {
            in = fread(buf, sizeof(char), COPY_BUF_SIZE, src);
            if (0 == in)
                break;
            out = fwrite(buf, sizeof(char), in, dst);
            if (0 == out)
                break;
        }
        fclose(src);
    }
    if (buffer) {
        fwrite(buffer, sizeof(char), strlen(buffer), dst);
    }
    fflush(dst);
    fclose(dst);
    return 0;
}

// detect the printer default parameters:
// printer_model: printer model (K2Pro, K2Plus, K2Max)
// cfg_filename: "/user/printer.cfg", "/user/printer_plus.cfg" or "/user/printer_max.cfg"
// grid_size: 5 for K2Pro or 7 for K2Plus and K2Max
// return 0 if success, or the error code
int detect_printer_defaults(const char **printer_model, const char **cfg_path, const char **cfg_filename, int *grid_size) {
    const char *k2pro_file = "printer.cfg";
    const char *k2plus_file = "printer_plus.cfg";
    const char *k2max_file = "printer_max.cfg";
    const char *k2pro_path = "/user/printer.cfg";
    const char *k2plus_path = "/user/printer_plus.cfg";
    const char *k2max_path = "/user/printer_max.cfg";
    const char *k2_file = NULL;
    const char *k2_path = NULL;
    const char *model_name = NULL;
    int grid = 0;

    // find out the model and the config file name
    if (file_lenght(k2pro_path) > 0) {
        k2_file = k2pro_file;
        k2_path = k2pro_path;
        model_name = "K2Pro";
        grid = 5;
    } else {
        if (file_lenght(k2plus_path) > 0) {
            k2_file = k2plus_file;
            k2_path = k2plus_path;
            model_name = "K2Plus";
            grid = 7;
        } else {
            if (file_lenght(k2max_path) > 0) {
                k2_file = k2max_file;
                k2_path = k2max_path;
                model_name = "K2Max";
                grid = 7;
            }
        }
    }

    if (cfg_path)
        *cfg_path = k2_path;
    if (cfg_filename)
        *cfg_filename = k2_file;
    if (grid_size)
        *grid_size = grid;
    if (printer_model)
        *printer_model = model_name;

    if (!k2_path) {
        return 1;
    } else {
        return 0;
    }
}

#define MAX_SUPPORTED_GRID_SIZE 10
#define BYTES_PER_GRID_ELEMENT 15
#define MESH_BUFFER_SIZE (MAX_SUPPORTED_GRID_SIZE * MAX_SUPPORTED_GRID_SIZE * BYTES_PER_GRID_ELEMENT + 1)

// keep the last used mesh in format printer*.cfg
char mesh_config[MESH_BUFFER_SIZE];
// keeps the last detected grid size from printer*.cfg, 0-unknown
int mesh_grid = 0;
// bed temperature
int bed_temp = 60;

// selected average precision from the config file
double precision = 0.01;
// set Z-offset in the printer*.cfg file
double z_offset = 0.0;

// clear the buffer for mesh from config
void mesh_config_clear(void) {
    memset(mesh_config, 0, MESH_BUFFER_SIZE);
}

// count comma-separated elements in mesh CSV string (returns element count)
static int count_mesh_elements(const char *buffer) {
    int count = 1;
    if (!buffer || buffer[0] == '\n' || buffer[0] == '\0') return 0;
    for (int i = 0; buffer[i] && buffer[i] != '\n'; i++) {
        if (buffer[i] == ',') count++;
    }
    return count;
}

// results:
// return the error code or 0 for success
// result=1 >>> missing config file
// result=2 >>> missing mesh information
// mesh_grid = detected grid size from the printer config file
// mesh_config[] = copy of the mesh as shown in the printer config file
int read_mesh_from_config_file(const char *config_path) {
    int result = 2;

    if (config_path == NULL) {
        return 1;
    } else {
        FILE *file;
        char *b = NULL;
        size_t len = 0;
        ssize_t read;
        int n, nn;

        // clear the result
        mesh_config_clear();
        mesh_grid = 0;
        bed_temp = 60;
        z_offset = 0.0;

        // read the file line by line
        file = fopen(config_path, "r");
        if (file) {
            while (1) {
                read = getline(&b, &len, file);
                if (read == -1) {
                    break;
                }
                n = strlen(b);
                if (n == 0)
                    continue;

                // line processing
                if (b[0] == 'p' && b[1] == 'o' && b[2] == 'i' && b[3] == 'n' && b[4] == 't' && b[5] == 's' && b[6] == ' ' && b[7] == ':' && b[8] == ' ') {
                    // found "points : "

                    // keep a copy of the original line
                    strcpy(mesh_config, &b[9]);

                    nn = count_mesh_elements(&b[9]);
                    mesh_grid = GRID[nn & 0xFF];

                    result = 0;
                } else if (b[0] == 'z' && b[1] == '_' && b[2] == 'o' && b[3] == 'f' && b[4] == 'f' &&
                          b[5] == 's' && b[6] == 'e' && b[7] == 't' && b[8] == ' ' && b[9] == ':' && b[10] == ' ') {
                    z_offset = atof(&b[11]);
                } else if (b[0] == 'b' && b[1] == 'e' && b[2] == 'd' && b[3] == '_' && b[4] == 'm' &&
                          b[5] == 'e' && b[6] == 's' && b[7] == 'h' && b[8] == '_' && b[9] == 't' && b[10] == 'e' &&
                          b[11] == 'm' && b[12] == 'p' && b[13] == ' ' && b[14] == ':' && b[15] == ' ') {
                    bed_temp = atoi(&b[16]);
                }
            }
            fclose(file);
            if (b)
                free(b);
        }
    }
    return result;
}

// Wrapper that reads from the default printer config
int read_mesh_from_printer_config(void) {
    const char *k2_cfg = NULL;
    int rr = detect_printer_defaults(NULL, &k2_cfg, NULL, NULL);
    if (rr) {
        return 1;
    }
    return read_mesh_from_config_file(k2_cfg);
}

config_option_t leveling_config = NULL;

// Read a U64 value from a file (used for cgroup memory files)
// Returns 0 on success, -1 on failure
static int read_u64_from_file(const char *path, U64 *value) {
    FILE *f = fopen(path, "r");
    if (!f) return -1;
    char buf[64];
    if (fgets(buf, sizeof(buf), f) == NULL) {
        fclose(f);
        return -1;
    }
    fclose(f);
    // Check for "max" which means no limit
    if (strncmp(buf, "max", 3) == 0) {
        *value = 0;  // signal no limit
        return -1;
    }
    *value = strtoull(buf, NULL, 10);
    return 0;
}

// Read a named U64 value from a cgroup memory.stat file (e.g. "inactive_file")
// Returns 0 on success, -1 on failure
static int read_u64_from_stat(const char *path, const char *key, U64 *value) {
    FILE *f = fopen(path, "r");
    if (!f) return -1;
    char line[128];
    size_t key_len = strlen(key);
    int found = -1;
    while (fgets(line, sizeof(line), f)) {
        if (strncmp(line, key, key_len) == 0 && line[key_len] == ' ') {
            *value = strtoull(line + key_len + 1, NULL, 10);
            found = 0;
            break;
        }
    }
    fclose(f);
    return found;
}

// Get memory info, preferring cgroup v2 files for container awareness.
// For cgroup path: subtracts inactive_file from memory.current so that
// reclaimable page cache is not counted as "used" memory.
// For bare metal: reads MemAvailable from /proc/meminfo (preferred) which
// accounts for buffers and cache, falling back to MemTotal-MemFree-Buffers-Cached.
void get_memory_info(U64 *total_mem, U64 *free_mem) {
    U64 cgroup_max = 0;
    U64 cgroup_current = 0;

    // Try cgroup v2 first (container-aware)
    int has_max = (read_u64_from_file("/sys/fs/cgroup/memory.max", &cgroup_max) == 0);
    int has_current = (read_u64_from_file("/sys/fs/cgroup/memory.current", &cgroup_current) == 0);

    if (has_max && has_current && cgroup_max > 0) {
        // Subtract inactive_file (reclaimable page cache) from current usage.
        // This matches what the kernel reports as "available" in cgroup context.
        U64 inactive_file = 0;
        read_u64_from_stat("/sys/fs/cgroup/memory.stat", "inactive_file", &inactive_file);
        U64 used = (cgroup_current > inactive_file) ? (cgroup_current - inactive_file) : 0;
        *total_mem = cgroup_max;
        *free_mem = (cgroup_max > used) ? (cgroup_max - used) : 0;
    } else {
        // Fall back to /proc/meminfo for bare metal.
        // Prefer MemAvailable (accounts for buffers/cache); fall back to
        // MemTotal - MemFree - Buffers - Cached if MemAvailable is absent.
        FILE *fp = fopen("/proc/meminfo", "r");
        if (fp) {
            U64 mem_total = 0, mem_free = 0, mem_available = 0;
            U64 buffers = 0, cached = 0;
            int has_available = 0;
            char line[128];
            while (fgets(line, sizeof(line), fp)) {
                unsigned long long val = 0;
                if (sscanf(line, "MemTotal: %llu kB", &val) == 1)       mem_total = val * 1024;
                else if (sscanf(line, "MemFree: %llu kB", &val) == 1)   mem_free = val * 1024;
                else if (sscanf(line, "MemAvailable: %llu kB", &val) == 1) { mem_available = val * 1024; has_available = 1; }
                else if (sscanf(line, "Buffers: %llu kB", &val) == 1)   buffers = val * 1024;
                else if (sscanf(line, "Cached: %llu kB", &val) == 1)    cached = val * 1024;
            }
            fclose(fp);
            *total_mem = mem_total;
            if (has_available) {
                *free_mem = mem_available;
            } else {
                U64 used = mem_total > (mem_free + buffers + cached)
                  ? mem_total - mem_free - buffers - cached : 0;
                *free_mem = mem_total > used ? mem_total - used : 0;
            }
        } else {
            *total_mem = 0;
            *free_mem = 0;
        }
    }
}



// replace the value of a given parameter name for the provided config file
// it will use a temporary file
// return 0 for success or the error code
int update_printer_config_file(const char *config_file, const char *parameter_name, const char *replacement_value) {
    FILE *ifile;
    FILE *ofile;
    char *b = NULL;
    size_t len = 0;
    ssize_t read;
    int i, n;
    char par[128];
    int par_size;
    char eol[2];
    int match_found = 0;

    // make a copy of the original config file
    custom_copy_file(config_file, "/user/printer-config.bak", "wb", NULL);

    sprintf(par, "%s : ", parameter_name);
    par_size = strlen(par);
    eol[0] = '\n';
    eol[1] = 0;

    ifile = fopen(config_file, "r");
    if (ifile) {
        ofile = fopen("/user/printer-config.tmp", "w");
        if (ofile) {
            while (1) {
                read = getline(&b, &len, ifile);
                if (read == -1) {
                    break;
                }
                // line size
                n = strlen(b);
                if (n == 0)
                    continue;

                // line processing...
                if (strncmp(b, par, par_size) == 0) {
                    // this is the line with the requested parameter, modify it
                    match_found = 1;
                    if (debug)
                        LOG( "update_printer_config_file: MATCH! param='%s' old_line='%.*s' new_value='%s'\n",
                                parameter_name, n - 1, b, replacement_value);
                    fwrite(par, 1, par_size, ofile);
                    fwrite(replacement_value, 1, strlen(replacement_value), ofile);
                    fwrite(eol, 1, 1, ofile);
                } else {
                    // not match, copy this entire line to the output file
                    fwrite(b, 1, n, ofile);
                }
            }
            if (debug && !match_found)
                LOG( "update_printer_config_file: NO MATCH for param='%s' in file='%s'\n",
                        parameter_name, config_file);
            fclose(ifile);
            fflush(ofile);
            fclose(ofile);
            if (b)
                free(b);
            // move the temp file to the original config file
            remove(config_file);
            custom_copy_file("/user/printer-config.tmp", config_file, "wb", NULL);
            remove("/user/printer-config.tmp");
            // Log config modification (always, not just debug)
            LOG( "Config updated: %s [%s]\n", config_file, parameter_name);
            return 0;
        } else {
            fclose(ifile);
            return 2;
        }
    }
    return 1;
}

static pthread_t webcam_thread_id;
static int webcam_thread_running = 0;
static time_t last_webcam_request_time = 0;
static pthread_mutex_t webcam_mutex = PTHREAD_MUTEX_INITIALIZER;

void *webcam_capture_thread(void *arg) {
    pthread_detach(pthread_self());

    if (debug) LOG( "+++ webcam thread: starting\n");
    if (v_open_camera() != 0) {
        if (debug) LOG( "--- webcam thread: v_open_camera failed\n");
        pthread_mutex_lock(&webcam_mutex);
        webcam_thread_running = 0;
        pthread_mutex_unlock(&webcam_mutex);
        return NULL;
    }
    if (debug) LOG( "+++ webcam thread: v_open_camera successful\n");

    while (1) {
        pthread_mutex_lock(&webcam_mutex);
        time_t now = time(NULL);
        if (now - last_webcam_request_time > 2) {
            if (debug) LOG( "+++ webcam thread: timeout, exiting\n");
            webcam_thread_running = 0;
            pthread_mutex_unlock(&webcam_mutex);
            break;
        }
        pthread_mutex_unlock(&webcam_mutex);

        if (debug) LOG( "+++ webcam thread: capturing frame\n");
        // capture one frame to the file "/tmp/cam.jpg"
        int result = v_capture_frame_to_file("/tmp/cam.tmp");
        if (result == 0) {
            if (debug) LOG( "+++ webcam thread: capture successful\n");
            rename("/tmp/cam.tmp", "/tmp/cam.jpg");
        } else {
            if (debug) LOG( "--- webcam thread: capture failed, result: %d\n", result);
            // errors, use the default image
            custom_copy_file("/mnt/UDISK/webfs/webcam/default.jpg", "/tmp/cam.jpg", "wb", NULL);
        }

        usleep(75000);  // 75ms
    }

    if (debug) LOG( "+++ webcam thread: closing camera\n");
    v_close_camera();
    if (debug) LOG( "+++ webcam thread: exited\n");
    return NULL;
}

//==============================================================================================================================
// CUSTOM PAGES
void process_custom_pages(char *filename_str, struct REQUEST *req) {
    // parse the query
    config_option_t query, co;
    query = read_config_file_from_get_request(req->query);

    // parse the configuration file if not already done
    if (!leveling_config) {
        leveling_config = read_config_file("/user/webfs/parameters.cfg");
        // get the most important parameters once
        char *precision_str = get_key_value(leveling_config, "precision", "0.01");
        precision = atof(precision_str);
        if ((precision < 0.0001) || (precision > 0.1)) {
            precision = 0.01;
        }
    }

    if (debug) {
        LOG( "+++ process_custom_pages: checking for custom pages for request path: %s\n", req->path);
    }

    if ((strstr(filename_str, "/mnt/UDISK/webfs/files/"))) {
        // turn off the cache for the files folder
        req->cache_turn_off = 'Y';
    }

    if ((strstr(filename_str, "/mnt/UDISK/webfs/api/"))) {
        // turn off the cache for the api folder
        req->cache_turn_off = 'Y';
    }

    // ----------------------------- access to the cam.jpg file -----------------------------
    if ((!strcmp(req->path, "/webcam/cam.jpg"))) {
        // turn off the cache
        req->cache_turn_off = 'Y';

        pthread_mutex_lock(&webcam_mutex);
        last_webcam_request_time = time(NULL);
        if (!webcam_thread_running) {
            if (debug) LOG( "+++ process_custom_pages: starting webcam thread\n");
            webcam_thread_running = 1;
            if (pthread_create(&webcam_thread_id, NULL, webcam_capture_thread, NULL) != 0) {
                if (debug) LOG( "--- process_custom_pages: failed to create webcam thread\n");
                webcam_thread_running = 0;
            }
        }
        pthread_mutex_unlock(&webcam_mutex);

        // if cam.jpg doesn't exist, copy default as a placeholder
        // the background thread will overwrite it.
        if (access("/tmp/cam.jpg", F_OK) == -1) {
            custom_copy_file("/mnt/UDISK/webfs/webcam/default.jpg", "/tmp/cam.jpg", "wb", NULL);
        }

        // Point the server to the image in tmpfs
        strcpy(filename_str, "/tmp/cam.jpg");
        goto e_x_i_t;
    }

e_x_i_t:

    // free the config file, will keep it forever in memory
    // free_config_file(leveling_config);

    // free the query
    free_config_file(query);
}
// CUSTOM PAGES
//==============================================================================================================================

void read_request(struct REQUEST *req, int pipelined) {
    int rc;
    char *h;

restart:

    rc = read(req->fd, req->hreq + req->hdata, MAX_HEADER - req->hdata);
    switch (rc) {
        case -1:
            if (errno == EAGAIN) {
                if (pipelined)
                    break; /* check if there is already a full request */
                else
                    return;
            }
            if (errno == EINTR)
                goto restart;
            xperror(LOG_INFO, "read", req->peerhost);
            /* fall through */
        case 0:
            req->state = STATE_CLOSE;
            return;
        default:
            req->hdata += rc;
            req->hreq[req->hdata] = 0;
    }

    /* check if this looks like a http request after
            the first few bytes... */
    if (req->hdata < 5)
        return;
    if (strncmp(req->hreq, "GET ", 4) != 0 &&
        strncmp(req->hreq, "PUT ", 4) != 0 &&
        strncmp(req->hreq, "HEAD ", 5) != 0 &&
        strncmp(req->hreq, "POST ", 5) != 0 &&
        strncmp(req->hreq, "DELETE ", 7) != 0) {
        mkerror(req, 400, 0);
        return;
    }

    /* header complete ?? */
    if (NULL != (h = strstr(req->hreq, "\r\n\r\n")) ||
        NULL != (h = strstr(req->hreq, "\n\n"))) {
        if (*h == '\r') {
            h += 4;
            *(h - 2) = 0;
        } else {
            h += 2;
            *(h - 1) = 0;
        }
        req->lreq = h - req->hreq;
        req->state = STATE_PARSE_HEADER;
        return;
    }

    if (req->hdata == MAX_HEADER) {
        /* oops: buffer full, but found no complete request ... */
        mkerror(req, 400, 0);
        return;
    }
    return;
}

/* ---------------------------------------------------------------------- */

static off_t
parse_off_t(char *str, int *pos) {
    off_t value = 0;

    while (isdigit(str[*pos])) {
        value *= 10;
        value += str[*pos] - '0';
        (*pos)++;
    }
    return value;
}

static int
parse_ranges(struct REQUEST *req) {
    char *h, *line = req->range_hdr;
    int i, off;

    for (h = line, req->ranges = 1; *h != '\n' && *h != '\0'; h++)
        if (*h == ',')
            req->ranges++;
    if (debug)
        LOG( "%03d: %d ranges:", req->fd, req->ranges);
    req->r_start = malloc(req->ranges * sizeof(off_t));
    req->r_end = malloc(req->ranges * sizeof(off_t));
    req->r_head = malloc((req->ranges + 1) * BR_HEADER);
    req->r_hlen = malloc((req->ranges + 1) * sizeof(int));
    if (NULL == req->r_start || NULL == req->r_end ||
        NULL == req->r_head || NULL == req->r_hlen) {
        if (req->r_start)
            free(req->r_start);
        if (req->r_end)
            free(req->r_end);
        if (req->r_head)
            free(req->r_head);
        if (req->r_hlen)
            free(req->r_hlen);
        if (debug)
            LOG( "oom\n");
        return 500;
    }
    for (i = 0, off = 0; i < req->ranges; i++) {
        if (line[off] == '-') {
            off++;
            if (!isdigit(line[off]))
                goto parse_error;
            req->r_start[i] = req->bst.st_size - parse_off_t(line, &off);
            req->r_end[i] = req->bst.st_size;
        } else {
            if (!isdigit(line[off]))
                goto parse_error;
            req->r_start[i] = parse_off_t(line, &off);
            if (line[off] != '-')
                goto parse_error;
            off++;
            if (isdigit(line[off]))
                req->r_end[i] = parse_off_t(line, &off) + 1;
            else
                req->r_end[i] = req->bst.st_size;
        }
        off++; /* skip "," */
        /* ranges ok? */
        if (debug)
            LOG( " %d-%d",
                    (int)(req->r_start[i]),
                    (int)(req->r_end[i]));
        if (req->r_start[i] > req->r_end[i] ||
            req->r_end[i] > req->bst.st_size)
            goto parse_error;
    }
    if (debug)
        LOG( " ok\n");
    return 0;

parse_error:
    req->ranges = 0;
    if (debug)
        LOG( " range error\n");
    return 400;
}

static int
unhex(unsigned char c) {
    if (c < '@')
        return c - '0';
    return (c & 0x0f) + 9;
}

/* handle %hex quoting, also split path / querystring */
static void
unquote(unsigned char *path, unsigned char *qs, unsigned char *src) {
    int q;
    unsigned char *dst;

    q = 0;
    dst = path;
    while (src[0] != 0) {
        if (!q && *src == '?') {
            q = 1;
            *dst = 0;
            dst = qs;
            src++;
            continue;
        }
        if (q && *src == '+') {
            *dst = ' ';
        } else if ((*src == '%') && isxdigit(src[1]) && isxdigit(src[2])) {
            *dst = (unhex(src[1]) << 4) | unhex(src[2]);
            src += 2;
        } else {
            *dst = *src;
        }
        dst++;
        src++;
    }
    *dst = 0;
}

/* delete unneeded path elements */
static void
fixpath(char *path) {
    char *dst = path;
    char *src = path;

    for (; *src;) {
        if (0 == strncmp(src, "//", 2)) {
            src++;
            continue;
        }
        if (0 == strncmp(src, "/./", 3)) {
            src += 2;
            continue;
        }
        *(dst++) = *(src++);
    }
    *dst = 0;
}

static int base64_table[] = {
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    62,
    -1,
    -1,
    -1,
    63,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51,
    -1,
    -1,
    -1,
    -1,
    -1,
};

static void
decode_base64(unsigned char *dest, unsigned char *src, int maxlen) {
    int a, b, d;

    for (a = 0, b = 0, d = 0; *src != 0 && d < maxlen; src++) {
        if (*src >= 128 || -1 == base64_table[*src])
            break;
        a = (a << 6) | base64_table[*src];
        b += 6;
        if (b >= 8) {
            b -= 8;
            dest[d++] = (a >> b) & 0xff;
        }
    }
    dest[d] = 0;
}

static int sanity_checks(struct REQUEST *req) {
    int i;

    /* path: must start with a '/' */
    if (req->path[0] != '/') {
        mkerror(req, 400, 0);
        return -1;
    }

    /* path: must not contain "/../" */
    if (strstr(req->path, "/../")) {
        mkerror(req, 403, 1);
        return -1;
    }

    if (req->hostname[0] == '\0')
        /* no hostname specified */
        return 0;

    /* validate hostname */
    for (i = 0; req->hostname[i] != '\0'; i++) {
        switch (req->hostname[i]) {
            case 'A' ... 'Z':
                req->hostname[i] += 32; /* lowercase */
            case 'a' ... 'z':
            case '0' ... '9':
            case '-':
                /* these are fine as-is */
                break;
            case '.':
                /* some extra checks */
                if (0 == i) {
                    /* don't allow a dot as first character */
                    mkerror(req, 400, 0);
                    return -1;
                }
                if ('.' == req->hostname[i - 1]) {
                    /* don't allow two dots in sequence */
                    mkerror(req, 400, 0);
                    return -1;
                }
                break;
            default:
                /* invalid character */
                mkerror(req, 400, 0);
                return -1;
        }
    }
    return 0;
}

// ================================================================================================================

void parse_request(struct REQUEST *req) {
    char filename[MAX_PATH + 1], proto[MAX_MISC + 1], *h;
    int port, rc, len;
    struct passwd *pw = NULL;

    if (debug)
        LOG( "%s\n", req->hreq);

    /* parse request. Here, scanf is powerful :-) */
    if (4 != sscanf(req->hreq,
                    "%" S(MAX_MISC) "[A-Z] "
                                    "%" S(MAX_PATH) "[^ \t\r\n] HTTP/%d.%d",
                    req->type, filename, &(req->major), &(req->minor))) {
        mkerror(req, 400, 0);
        return;
    }
    if (filename[0] == '/') {
        strncpy(req->uri, filename, sizeof(req->uri) - 1);
    } else {
        port = 0;
        *proto = 0;
        if (4 != sscanf(filename,
                        "%" S(MAX_MISC) "[a-zA-Z]://"
                                        "%" S(MAX_HOST) "[a-zA-Z0-9.-]:%d"
                                                        "%" S(MAX_PATH) "[^ \t\r\n]",
                        proto, req->hostname, &port, req->uri) &&
            3 != sscanf(filename,
                        "%" S(MAX_MISC) "[a-zA-Z]://"
                                        "%" S(MAX_HOST) "[a-zA-Z0-9.-]"
                                                        "%" S(MAX_PATH) "[^ \t\r\n]",
                        proto, req->hostname, req->uri)) {
            mkerror(req, 400, 0);
            return;
        }
        if (*proto != 0 && 0 != strcasecmp(proto, "http")) {
            mkerror(req, 400, 0);
            return;
        }
    }

    unquote(req->path, req->query, req->uri);
    fixpath(req->path);
    if (debug)
        LOG( "%03d: %s \"%s\" HTTP/%d.%d\n",
                req->fd, req->type, req->path, req->major, req->minor);

    if (debug)
        LOG( "query: \"%s\"\n", req->query);

    if (0 != strcmp(req->type, "GET") &&
        0 != strcmp(req->type, "HEAD") &&
        0 != strcmp(req->type, "PUT") &&
        0 != strcmp(req->type, "POST") &&
        0 != strcmp(req->type, "DELETE")) {
        mkerror(req, 501, 0);
        return;
    }

    if (0 == strcmp(req->type, "HEAD")) {
        req->head_only = 1;
    }

    /* parse header lines */
    req->keep_alive = req->minor;
    req->content_length = 0;
    req->accept_json = 0;
    for (h = req->hreq; h - req->hreq < req->lreq;) {
        h = strchr(h, '\n');
        if (NULL == h)
            break;
        h++;

        h[-2] = 0;
        h[-1] = 0;
        list_add(&req->header, h, 0);

        if (0 == strncasecmp(h, "Connection: ", 12)) {
            req->keep_alive = (0 == strncasecmp(h + 12, "Keep-Alive", 10));
        } else if (0 == strncasecmp(h, "Host: ", 6)) {
            if (2 != sscanf(h + 6, "%" S(MAX_HOST) "[a-zA-Z0-9.-]:%d",
                            req->hostname, &port))
                sscanf(h + 6, "%" S(MAX_HOST) "[a-zA-Z0-9.-]",
                      req->hostname);
        } else if (0 == strncasecmp(h, "If-Modified-Since: ", 19)) {
            req->if_modified = h + 19;
        } else if (0 == strncasecmp(h, "If-Unmodified-Since: ", 21)) {
            req->if_unmodified = h + 21;
        } else if (0 == strncasecmp(h, "If-Range: ", 10)) {
            req->if_range = h + 10;
        } else if (0 == strncasecmp(h, "Authorization: Basic ", 21)) {
            decode_base64(req->auth, h + 21, sizeof(req->auth) - 1);
            if (debug)
                LOG( "%03d: auth: %s\n", req->fd, req->auth);
        } else if (0 == strncasecmp(h, "Range: bytes=", 13)) {
            /* parsing must be done after fstat, we need the file size
                    for the boundary checks */
            req->range_hdr = h + 13;
        } else if (0 == strncasecmp(h, "Content-Length: ", 16)) {
            req->content_length = atoi(h + 16);
        } else if (0 == strncasecmp(h, "Accept: ", 8)) {
            if (strstr(h + 8, "application/json"))
                req->accept_json = 1;
        }
    }
    if (debug) {
        if (req->if_modified)
            LOG( "%03d: if-modified-since: \"%s\"\n",
                    req->fd, req->if_modified);
        if (req->if_unmodified)
            LOG( "%03d: if-unmodified-since: \"%s\"\n",
                    req->fd, req->if_unmodified);
        if (req->if_range)
            LOG( "%03d: if-range: \"%s\"\n",
                    req->fd, req->if_range);
    }


    // Read request body for PUT requests
    if ((0 == strcmp(req->type, "PUT") || 0 == strcmp(req->type, "POST")) && req->content_length > 0) {
        if (req->content_length > MAX_HEADER) { // Or some other reasonable limit
            mkerror(req, 413, 0); // Payload Too Large
            return;
        }
        req->req_body = malloc(req->content_length + 1);
        if (req->req_body == NULL) {
            mkerror(req, 500, 0);
            return;
        }

        int body_read = 0;
        // Body starts at req->lreq (set by read_request after finding header end)
        int body_start_offset = req->lreq;
        int initial_body_len = req->hdata - body_start_offset;
        if (initial_body_len > 0) {
            memcpy(req->req_body, req->hreq + body_start_offset, initial_body_len);
            body_read = initial_body_len;
        }

        while (body_read < req->content_length) {
            rc = read(req->fd, req->req_body + body_read, req->content_length - body_read);
            if (rc <= 0) {
                // Error or connection closed
                free(req->req_body);
                req->req_body = NULL;
                mkerror(req, 400, 0);
                return;
            }
            body_read += rc;
        }
        req->req_body[req->content_length] = '\0';
    }


    /* take care about the hostname */
    if (virtualhosts) {
        if (req->hostname[0] == 0) {
            if (req->minor > 0) {
                /* HTTP/1.1 clients MUST specify a hostname */
                mkerror(req, 400, 0);
                return;
            }
            strncpy(req->hostname, server_host, sizeof(req->hostname) - 1);
        }
    } else {
        if (req->hostname[0] == '\0' || canonicalhost)
            strncpy(req->hostname, server_host, sizeof(req->hostname) - 1);
    }

    /* checks */
    if (0 != sanity_checks(req))
        return;

    /* check basic auth */
    if (NULL != userpass && 0 != strcmp(userpass, req->auth)) {
        mkerror(req, 401, 1);
        return;
    }

    /* build filename */
    if (userdir && '~' == req->path[1]) {
        /* expand user directories, i.e.
                /~user/path/file => $HOME/public_html/path/file */
        h = strchr(req->path + 2, '/');
        if (NULL == h) {
            mkerror(req, 404, 1);
            return;
        }
        *h = 0;
        pw = getpwnam(req->path + 2);
        *h = '/';
        if (NULL == pw) {
            mkerror(req, 404, 1);
            return;
        }
        len = snprintf(filename, sizeof(filename) - 1,
                      "%s/%s/%s", pw->pw_dir, userdir, h + 1);
    } else {
        len = snprintf(filename, sizeof(filename) - 1,
                      "%s%s%s%s",
                      do_chroot ? "" : doc_root,
                      virtualhosts ? "/" : "",
                      virtualhosts ? req->hostname : "",
                      req->path);
    }

    req->cache_turn_off = 'N';

    // process the custom pages
    if (strncmp(req->path, "/api/", 5) == 0) {
        // Check if it's a profiles, security, system, or webserver API route
        if (strncmp(req->path, "/api/profiles", 13) == 0 ||
            strncmp(req->path, "/api/security", 13) == 0 ||
            strncmp(req->path, "/api/system", 11) == 0 ||
            strcmp(req->path, "/api/webserver") == 0) {
            handle_api_request(req, filename);
            return; // API request handled, don't continue with file serving
        }
    }
    process_custom_pages(filename, req);

    h = filename + len - 1;
    if (*h == '/') {
        /* looks like the client asks for a directory */
        if (indexhtml) {
            /* check for index file */
            strncpy(h + 1, indexhtml, sizeof(filename) - len - 1);
            if (-1 != (req->bfd = open(filename, O_RDONLY))) {
                /* ok, we have one */
                close_on_exec(req->bfd);
                goto regular_file;
            } else {
                if (errno == ENOENT) {
                    /* no such file or directory => listing */
                    h[1] = '\0';
                } else {
                    mkerror(req, 403, 1);
                    return;
                }
            }
        }

        if (no_listing) {
            /* For SvelteKit SPA, serve index.html instead of 403 for non-existent directories */
            int is_api_route = (strncmp(req->path, "/api/", 5) == 0);
            int is_static_asset = (strncmp(req->path, "/_app/", 6) == 0) ||
                                  (strncmp(req->path, "/webcam/", 8) == 0) ||
                                  (strncmp(req->path, "/files/", 7) == 0) ||
                                  (strncmp(req->path, "/deprecated/", 12) == 0);

            if (!is_api_route && !is_static_asset) {
                /* Try to serve root index.html for SPA routing */
                char index_path[1024];
                int index_len = snprintf(index_path, sizeof(index_path) - 1,
                          "%s%s%s%s",
                          do_chroot ? "" : doc_root,
                          virtualhosts ? "/" : "",
                          virtualhosts ? req->hostname : "",
                          "/index.html");
                if (index_len > 0 && index_len < (int)sizeof(index_path)) {
                    if (-1 != (req->bfd = open(index_path, O_RDONLY))) {
                        close_on_exec(req->bfd);
                        goto regular_file;
                    }
                }
            }
            mkerror(req, 403, 1);
            return;
        };

        if (-1 == stat(filename, &(req->bst))) {
            if (errno == EACCES) {
                mkerror(req, 403, 1);
            } else {
                /* Directory doesn't exist - check if this is a SvelteKit SPA route */
                int is_api_route = (strncmp(req->path, "/api/", 5) == 0);
                int is_static_asset = (strncmp(req->path, "/_app/", 6) == 0) ||
                                      (strncmp(req->path, "/webcam/", 8) == 0) ||
                                      (strncmp(req->path, "/files/", 7) == 0) ||
                                      (strncmp(req->path, "/deprecated/", 12) == 0);

                if (!is_api_route && !is_static_asset) {
                    /* Try to serve root index.html for SPA routing */
                    char index_path[1024];
                    int index_len = snprintf(index_path, sizeof(index_path) - 1,
                              "%s%s%s%s",
                              do_chroot ? "" : doc_root,
                              virtualhosts ? "/" : "",
                              virtualhosts ? req->hostname : "",
                              "/index.html");
                    if (index_len > 0 && index_len < (int)sizeof(index_path)) {
                        if (-1 != (req->bfd = open(index_path, O_RDONLY))) {
                            close_on_exec(req->bfd);
                            strcpy(filename, index_path);
                            goto regular_file;
                        }
                    }
                }
                mkerror(req, 404, 1);
            }
            return;
        }
        // Set modification time and current time for directory listings
        struct tm tm_mtime, tm_ctime;
        time_t curtime;
        time(&curtime);

        gmtime_r(&req->bst.st_mtime, &tm_mtime);
        gmtime_r(&curtime, &tm_ctime);

        strftime(req->mtime, sizeof(req->mtime), RFC1123, &tm_mtime);
        strftime(req->ctime, sizeof(req->ctime), RFC1123, &tm_ctime);

        if (req->accept_json) {
            /* JSON directory listing */
            req->mime = "application/json";
            req->dir = NULL;
            int json_len = 0;
            req->body = get_dir_json(filename, req->path, &json_len);
            if (req->body) {
                req->lbody = json_len;
                req->body_is_malloced = 1;  /* Mark as dynamically allocated */
            }
        } else {
            req->mime = "text/html";
            req->dir = get_dir(req, filename);
        }
        if (NULL == req->body && NULL == req->dir) {
            /* We arrive here if opendir failed, probably due to -EPERM
            * It does exist (see the stat() call above) */
            mkerror(req, 403, 1);
            return;
        } else if (NULL != req->if_modified &&
                  0 == strcmp(req->if_modified, req->mtime)) {
            /* 304 not modified */
            mkheader(req, 304);
            req->head_only = 1;
        } else {
            /* 200 OK */
            mkheader(req, 200);
        }
        return;
    }

    /* it is /probably/ a regular file */
    if (-1 == (req->bfd = open(filename, O_RDONLY))) {
        if (errno == EACCES) {
            mkerror(req, 403, 1);
        } else if (errno == ENOENT) {
            /* File not found - check if this is a SvelteKit SPA route */
            /* Don't serve index.html for API routes, static assets, or files with extensions */
            int is_api_route = (strncmp(req->path, "/api/", 5) == 0);
            int is_static_asset = (strncmp(req->path, "/_app/", 6) == 0) ||
                                  (strncmp(req->path, "/webcam/", 8) == 0) ||
                                  (strncmp(req->path, "/files/", 7) == 0) ||
                                  (strncmp(req->path, "/deprecated/", 12) == 0) ||
                                  (strchr(req->path, '.') != NULL); /* Has file extension */

            if (!is_api_route && !is_static_asset) {
                /* This is likely a SvelteKit route - serve index.html for SPA routing */
                char index_path[1024];
                int index_len = snprintf(index_path, sizeof(index_path) - 1,
                          "%s%s%s%s",
                          do_chroot ? "" : doc_root,
                          virtualhosts ? "/" : "",
                          virtualhosts ? req->hostname : "",
                          "/index.html");
                if (index_len > 0 && index_len < (int)sizeof(index_path)) {
                    if (-1 != (req->bfd = open(index_path, O_RDONLY))) {
                        /* Successfully opened index.html - continue to serve it */
                        strcpy(filename, index_path);
                        goto regular_file;
                    }
                }
            }
            /* Fall through to 404 if we couldn't serve index.html */
            mkerror(req, 404, 1);
        } else {
            mkerror(req, 404, 1);
        }
        return;
    }

regular_file:

    fstat(req->bfd, &(req->bst));
    if (req->range_hdr)
        if (0 != (rc = parse_ranges(req))) {
            mkerror(req, rc, 1);
            return;
        }

    if (!S_ISREG(req->bst.st_mode)) {
        /* /not/ a regular file */
        close(req->bfd);
        req->bfd = -1;
        if (S_ISDIR(req->bst.st_mode)) {
            /* oops: a directory without trailing slash */
            strcat(req->path, "/");
            mkredirect(req);
        } else {
            /* anything else is'nt allowed here */
            mkerror(req, 403, 1);
        }
        return;
    }

    /* it is /really/ a regular file */

    req->mime = get_mime(filename);

    // Set modification time and current time for regular files
    struct tm tm_mtime, tm_ctime;
    time_t curtime;
    time(&curtime);

    if (req->cache_turn_off == 'Y') {
        gmtime_r(&curtime, &tm_mtime);
    } else {
        gmtime_r(&req->bst.st_mtime, &tm_mtime);
    }
    gmtime_r(&curtime, &tm_ctime);

    strftime(req->mtime, sizeof(req->mtime), RFC1123, &tm_mtime);
    strftime(req->ctime, sizeof(req->ctime), RFC1123, &tm_ctime);
    if (NULL != req->if_range && 0 != strcmp(req->if_range, req->mtime))
        /* mtime mismatch -> no ranges */
        req->ranges = 0;
    if (NULL != req->if_unmodified && 0 != strcmp(req->if_unmodified, req->mtime)) {
        /* 412 precondition failed */
        mkerror(req, 412, 1);
    } else if (NULL != req->if_modified && 0 == strcmp(req->if_modified, req->mtime)) {
        /* 304 not modified */
        mkheader(req, 304);
        req->head_only = 1;
    } else if (req->ranges > 0) {
        /* send byte range(s) */
        mkheader(req, 206);
    } else {
        /* normal */
        mkheader(req, 200);
    }
    return;
}
