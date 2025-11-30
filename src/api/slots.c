#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "../httpd.h"
#include "helpers.h"
#include "slots.h"

// External functions from request.c
extern int custom_copy_file(const char *from, const char *to, const char *mode, const char *buffer);

// External buffer from api.c
extern char api_response_buffer[8192];

// PUT /api/profiles/{id}/slots/{n}
void handle_put_profile_slot(struct REQUEST *req, const char *profile_id_str, int slot_id) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID.\"}");
    mkheader(req, 400);
  } else if (slot_id <= 0 || slot_id >= 100) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid slot ID.\"}");
    mkheader(req, 400);
  } else if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    mkheader(req, 404);
  } else if (req->req_body == NULL) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    mkheader(req, 400);
  } else {
    char *mesh_data = get_json_value(req->req_body, "\"mesh_data\"");
    if (mesh_data) {
      char fn_buf[512];
      if (is_current) {
        snprintf(fn_buf, sizeof(fn_buf), "/user/webfs/data_slot_%d.txt", slot_id);
      } else {
        char slots_dir[512];
        snprintf(slots_dir, sizeof(slots_dir), "/user/webfs/profiles/%d/slots", profile_id);
        mkdir_p(slots_dir);
        snprintf(fn_buf, sizeof(fn_buf), "%s/data_slot_%d.txt", slots_dir, slot_id);
      }

      if (custom_copy_file(NULL, fn_buf, "wb", mesh_data) == 0) {
        snprintf(api_response_buffer, sizeof(api_response_buffer),
                "{\"status\": \"success\", \"message\": \"Mesh saved to slot %d.\"}", slot_id);
        mkheader(req, 200);
      } else {
        snprintf(api_response_buffer, sizeof(api_response_buffer),
                "{\"status\": \"error\", \"message\": \"Failed to write to file.\"}");
        mkheader(req, 500);
      }
    } else {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Invalid JSON payload. Missing 'mesh_data'.\"}");
      mkheader(req, 400);
    }
  }
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
}

// DELETE /api/profiles/{id}/slots/{n}
void handle_delete_profile_slot(struct REQUEST *req, const char *profile_id_str, int slot_id) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID.\"}");
    mkheader(req, 400);
  } else if (slot_id <= 0 || slot_id >= 100) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid slot ID.\"}");
    mkheader(req, 400);
  } else if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    mkheader(req, 404);
  } else {
    char fn_buf[512];
    if (is_current) {
      snprintf(fn_buf, sizeof(fn_buf), "/user/webfs/data_slot_%d.txt", slot_id);
    } else {
      snprintf(fn_buf, sizeof(fn_buf), "/user/webfs/profiles/%d/slots/data_slot_%d.txt", profile_id, slot_id);
    }

    if (remove(fn_buf) == 0) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"success\", \"message\": \"Mesh slot %d deleted.\"}", slot_id);
      mkheader(req, 200);
    } else {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not delete mesh slot %d. It may not exist.\"}", slot_id);
      mkheader(req, 404);
    }
  }
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
}
