#include <sys/socket.h>
#include <netinet/in.h>
#include <sys/sysinfo.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <dirent.h>

#define JSMN_STATIC
#define JSMN_PARENT_LINKS
#include "jsmn.h"

#include "httpd.h"
#include "api.h"
#include "api/helpers.h"
#include "api/profiles.h"
#include "api/slots.h"
#include "api/settings.h"

// External functions from request.c
extern int file_exists(const char *path);

// A buffer to hold the JSON response
char api_response_buffer[8192];

// Main API request handler
void handle_api_request(struct REQUEST *req, char *filename) {
  req->cache_turn_off = 'Y';

  // GET /api/profiles
  if (strcmp(req->path, "/api/profiles") == 0 && strcmp(req->type, "GET") == 0) {
    handle_get_profiles(req);
    return;
  }

  // GET /api/profiles/current or GET /api/profiles/{id}
  if (strncmp(req->path, "/api/profiles/", 14) == 0 && strcmp(req->type, "GET") == 0) {
    const char *profile_id_str = req->path + 14;
    const char *slash = strchr(profile_id_str, '/');
    if (!slash) {
      handle_get_profile(req, profile_id_str);
      return;
    }
  }

  // PUT /api/profiles/{id} - Update profile metadata
  if (strncmp(req->path, "/api/profiles/", 14) == 0 && strcmp(req->type, "PUT") == 0) {
    const char *profile_id_str = req->path + 14;
    const char *slash = strchr(profile_id_str, '/');
    if (!slash) {
      handle_put_profile(req, profile_id_str);
      return;
    }
  }

  // DELETE /api/profiles/{id}
  if (strncmp(req->path, "/api/profiles/", 14) == 0 && strcmp(req->type, "DELETE") == 0) {
    const char *profile_id_str = req->path + 14;
    const char *slash = strchr(profile_id_str, '/');
    if (!slash) {
      handle_delete_profile(req, profile_id_str);
      return;
    }
  }

  // POST /api/profiles/{id}/save-as
  if (strncmp(req->path, "/api/profiles/", 14) == 0 && strcmp(req->type, "POST") == 0) {
    const char *rest = req->path + 14;
    const char *slash = strchr(rest, '/');
    if (slash) {
      char profile_id_str[32];
      size_t id_len = slash - rest;
      if (id_len >= sizeof(profile_id_str)) id_len = sizeof(profile_id_str) - 1;
      strncpy(profile_id_str, rest, id_len);
      profile_id_str[id_len] = '\0';

      if (strcmp(slash + 1, "save-as") == 0) {
        handle_post_save_as(req, profile_id_str);
        return;
      }
    }
  }

  // PUT /api/profiles/{id}/slots/{n}
  if (strncmp(req->path, "/api/profiles/", 14) == 0 && strcmp(req->type, "PUT") == 0) {
    const char *rest = req->path + 14;
    const char *slash1 = strchr(rest, '/');
    if (slash1) {
      char profile_id_str[32];
      size_t id_len = slash1 - rest;
      if (id_len >= sizeof(profile_id_str)) id_len = sizeof(profile_id_str) - 1;
      strncpy(profile_id_str, rest, id_len);
      profile_id_str[id_len] = '\0';

      if (strncmp(slash1 + 1, "slots/", 6) == 0) {
        int slot_id = atoi(slash1 + 7);
        handle_put_profile_slot(req, profile_id_str, slot_id);
        return;
      } else if (strcmp(slash1 + 1, "printer-mesh") == 0) {
        handle_put_profile_printer_mesh(req, profile_id_str);
        return;
      } else if (strcmp(slash1 + 1, "settings") == 0) {
        handle_put_profile_settings(req, profile_id_str);
        return;
      }
    }
  }

  // DELETE /api/profiles/{id}/slots/{n}
  if (strncmp(req->path, "/api/profiles/", 14) == 0 && strcmp(req->type, "DELETE") == 0) {
    const char *rest = req->path + 14;
    const char *slash1 = strchr(rest, '/');
    if (slash1) {
      char profile_id_str[32];
      size_t id_len = slash1 - rest;
      if (id_len >= sizeof(profile_id_str)) id_len = sizeof(profile_id_str) - 1;
      strncpy(profile_id_str, rest, id_len);
      profile_id_str[id_len] = '\0';

      if (strncmp(slash1 + 1, "slots/", 6) == 0) {
        int slot_id = atoi(slash1 + 7);
        handle_delete_profile_slot(req, profile_id_str, slot_id);
        return;
      }
    }
  }

  // POST /api/security/password
  if (strcmp(req->path, "/api/security/password") == 0 && strcmp(req->type, "POST") == 0) {
    handle_post_security_password(req);
    return;
  }

  // GET /api/system - Get system information
  if (strcmp(req->path, "/api/system") == 0 && strcmp(req->type, "GET") == 0) {
    handle_get_system(req);
    return;
  }

  // POST /api/system/reboot
  if (strcmp(req->path, "/api/system/reboot") == 0 && strcmp(req->type, "POST") == 0) {
    handle_post_system_reboot(req);
    return;
  }

  // POST /api/system/poweroff
  if (strcmp(req->path, "/api/system/poweroff") == 0 && strcmp(req->type, "POST") == 0) {
    handle_post_system_poweroff(req);
    return;
  }

  // POST /api/system/ssh
  if (strcmp(req->path, "/api/system/ssh") == 0 && strcmp(req->type, "POST") == 0) {
    handle_post_system_ssh(req);
    return;
  }

  // POST /api/system/log/clear
  if (strcmp(req->path, "/api/system/log/clear") == 0 && strcmp(req->type, "POST") == 0) {
    handle_post_system_log_clear(req);
    return;
  }

  // Fallback for unknown endpoints
  snprintf(api_response_buffer, sizeof(api_response_buffer),
          "{\"status\": \"error\", \"message\": \"API endpoint not found\"}");
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, 404);
}

// POST /api/security/password - Change root password
void handle_post_security_password(struct REQUEST *req) {
  if (req->req_body == NULL) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  char *password = get_json_value(req->req_body, "\"password\"");
  if (!password || strlen(password) == 0) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid JSON payload. Missing 'password'.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  // Change root password using passwd (OpenWRT/TinaLinux compatible)
  // passwd expects password on stdin twice (new password + confirmation)
  // Output varies (4-5 lines):
  //   Real printer: "Changing password for root\nNew password:\nRetype password:\npasswd: password for root changed by root"
  //   Testbed: "Changing password for root\nNew password:\nBad password: too weak\nRetype password:\npasswd: password for root changed by root"
  // Read enough lines to capture the last line with success message
  char command[512];
  snprintf(command, sizeof(command), "printf '%%s\\n%%s\\n' '%s' '%s' | passwd root 2>&1", password, password);
  system_with_output(command, 6);  // Read up to 6 lines to ensure we get the success message

  // Check for the specific success message: "password for root changed"
  if (strstr(system_buffer, "password for root changed") != NULL) {
    LOG("Root password changed successfully\n");
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"Root password changed successfully\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 200);
  } else {
    LOG("Failed to change root password: %s\n", system_buffer);
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Failed to change password\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 500);
  }
}

// GET /api/system - Get system information without using popen or disk writes
void handle_get_system(struct REQUEST *req) {
  struct sysinfo s_info;
  int error = sysinfo(&s_info);
  unsigned int uptime = 0;
  if (!error) {
    uptime = s_info.uptime;
  }
  int ut_h = uptime / 3600;
  int ut_m = (uptime / 60) % 60;
  int ut_s = uptime % 60;

  // Get memory info (cgroup-aware for containers, sysinfo fallback for bare metal)
  unsigned long long total_mem = 0;
  unsigned long long free_mem = 0;
  get_memory_info(&total_mem, &free_mem);
  unsigned long long free_mem_per = total_mem > 0 ? (free_mem * 100) / total_mem : 0;

  // Read CPU stats directly from /proc/stat
  unsigned int cpu_use = 0;
  unsigned int cpu_usr_use = 0;
  unsigned int cpu_sys_use = 0;
  unsigned int cpu_idle = 0;

  FILE *fp = fopen("/proc/stat", "r");
  if (fp) {
    char line[256];
    if (fgets(line, sizeof(line), fp)) {
      char cpu[10];
      int t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
      int n = sscanf(line, "%s %d %d %d %d %d %d %d %d %d %d",
        cpu, &t0, &t1, &t2, &t3, &t4, &t5, &t6, &t7, &t8, &t9);
      if (n == 11) {
        unsigned long long total = (unsigned long long)t0 + t2 + t3;
        if (total > 0) {
          cpu_use = (((unsigned long long)t0 + t2) * 100) / total;
          cpu_usr_use = ((unsigned long long)t0 * 100) / total;
          cpu_sys_use = ((unsigned long long)t2 * 100) / total;
          cpu_idle = ((unsigned long long)t3 * 100) / total;
        }
      }
    }
    fclose(fp);
  }

  // Check SSH status by scanning /proc for dropbear processes
  int ssh_status = 0;  // not installed
  if (file_exists("/opt/etc/init.d/S51dropbear")) {
    // Scan /proc to find dropbear process (equivalent to pidof dropbear)
    DIR *proc_dir = opendir("/proc");
    int found_dropbear = 0;
    if (proc_dir) {
      struct dirent *entry;
      while ((entry = readdir(proc_dir)) != NULL && !found_dropbear) {
        // Check if directory name is a number (PID) - skip if name doesn't start with digit
        if (entry->d_name[0] >= '1' && entry->d_name[0] <= '9') {
          char cmdline_path[256];
          snprintf(cmdline_path, sizeof(cmdline_path), "/proc/%s/cmdline", entry->d_name);
          FILE *cmdline_fp = fopen(cmdline_path, "r");
          if (cmdline_fp) {
            char cmdline[256];
            size_t len = fread(cmdline, 1, sizeof(cmdline) - 1, cmdline_fp);
            fclose(cmdline_fp);
            if (len >= 8) {
              // Search for "dropbear" in the entire buffer (cmdline has null bytes between args)
              for (size_t i = 0; i + 8 <= len; i++) {
                if (memcmp(&cmdline[i], "dropbear", 8) == 0) {
                  found_dropbear = 1;
                  break;
                }
              }
            }
          }
        }
      }
      closedir(proc_dir);
    }
    ssh_status = found_dropbear ? 2 : 1;  // 2=running, 1=stopped
  }

  // Build JSON response in memory
  snprintf(api_response_buffer, sizeof(api_response_buffer),
          "{\"api_ver\":1, \"total_mem\":%llu, \"free_mem\":%llu, \"free_mem_per\":%llu, "
          "\"cpu_use\":%u, \"cpu_usr_use\":%u, \"cpu_sys_use\":%u, \"cpu_idle\":%u, "
          "\"ssh_status\":%d, \"uptime\": \"%02d:%02d:%02d\"}",
          (unsigned long long)total_mem, (unsigned long long)free_mem, (unsigned long long)free_mem_per,
          cpu_use, cpu_usr_use, cpu_sys_use, cpu_idle, ssh_status, ut_h, ut_m, ut_s);

  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, 200);
}

// POST /api/system/reboot - Reboot the system
void handle_post_system_reboot(struct REQUEST *req) {
  LOG("System reboot requested\n");
  system_with_output("sync && reboot &", 1);

  snprintf(api_response_buffer, sizeof(api_response_buffer),
          "{\"status\": \"success\", \"message\": \"System is rebooting\"}");
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, 200);
}

// POST /api/system/ssh - Start/stop SSH service
void handle_post_system_ssh(struct REQUEST *req) {
  if (req->req_body == NULL) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  char *action = get_json_value(req->req_body, "\"action\"");
  if (!action) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid JSON payload. Missing 'action'.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  if (strcmp(action, "start") == 0) {
    LOG("Starting SSH service...\n");
    system_with_output("/opt/etc/init.d/S51dropbear start 2>&1", 1);
    LOG("SSH service started\n");
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"SSH service started\"}");
  } else if (strcmp(action, "stop") == 0) {
    LOG("Stopping SSH service...\n");
    system_with_output("/opt/etc/init.d/S51dropbear stop 2>&1", 1);
    LOG("SSH service stopped\n");
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"SSH service stopped\"}");
  } else if (strcmp(action, "restart") == 0) {
    LOG("Restarting SSH service...\n");
    system_with_output("/opt/etc/init.d/S51dropbear restart 2>&1", 1);
    LOG("SSH service restarted\n");
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"SSH service restarted\"}");
  } else {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid action. Use 'start', 'stop', or 'restart'.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, 200);
}

// POST /api/system/poweroff - Power off the system
void handle_post_system_poweroff(struct REQUEST *req) {
  LOG("System poweroff requested\n");
  system_with_output("sync && poweroff &", 1);

  snprintf(api_response_buffer, sizeof(api_response_buffer),
          "{\"status\": \"success\", \"message\": \"System is shutting down\"}");
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, 200);
}

// POST /api/system/log/clear - Clear the printer log
void handle_post_system_log_clear(struct REQUEST *req) {
  LOG("Clearing log...\n");
  system_with_output("cat /dev/null > /mnt/UDISK/log", 1);
  LOG("Log cleared\n");

  snprintf(api_response_buffer, sizeof(api_response_buffer),
          "{\"status\": \"success\", \"message\": \"Log cleared\"}");
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, 200);
}
