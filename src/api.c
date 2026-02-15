#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define JSMN_STATIC
#define JSMN_PARENT_LINKS
#include "jsmn.h"

#include "api.h"
#include "api/helpers.h"
#include "api/profiles.h"
#include "api/slots.h"
#include "api/settings.h"

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

  // POST /api/system/reboot
  if (strcmp(req->path, "/api/system/reboot") == 0 && strcmp(req->type, "POST") == 0) {
    handle_post_system_reboot(req);
    return;
  }

  // POST /api/system/ssh
  if (strcmp(req->path, "/api/system/ssh") == 0 && strcmp(req->type, "POST") == 0) {
    handle_post_system_ssh(req);
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

  // Use chpasswd to change root password
  char command[512];
  snprintf(command, sizeof(command), "echo 'root:%s' | chpasswd", password);
  int result = system(command);

  if (result == 0) {
    fprintf(stderr, "Root password changed successfully\n");
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"Root password changed successfully\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 200);
  } else {
    fprintf(stderr, "Failed to change root password (exit code: %d)\n", result);
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Failed to change password\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 500);
  }
}

// POST /api/system/reboot - Reboot the system
void handle_post_system_reboot(struct REQUEST *req) {
  fprintf(stderr, "System reboot requested\n");
  system("sync && reboot &");

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
    system("/opt/etc/init.d/S51dropbear start 2>&1");
    fprintf(stderr, "SSH service started\n");
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"SSH service started\"}");
  } else if (strcmp(action, "stop") == 0) {
    system("/opt/etc/init.d/S51dropbear stop 2>&1");
    fprintf(stderr, "SSH service stopped\n");
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"SSH service stopped\"}");
  } else {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid action. Use 'start' or 'stop'.\"}");
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
