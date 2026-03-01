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

// PUT /api/profiles/{id}/slots/{n}
void handle_put_profile_slot(struct REQUEST *req, const char *profile_id_str, int slot_id) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);
  int status_code = 200;

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID.\"}");
    status_code = 400;
  } else if (slot_id <= 0 || slot_id >= 100) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid slot ID.\"}");
    status_code = 400;
  } else if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    status_code = 404;
  } else if (req->req_body == NULL) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    status_code = 400;
  } else {
    // Note: get_json_value() uses a static buffer, copy values before next call
    char mesh_data_buf[4096] = {0};
    char z_offset_buf[32] = {0};

    char *mesh_data_val = get_json_value(req->req_body, "\"mesh_data\"");
    if (mesh_data_val) strncpy(mesh_data_buf, mesh_data_val, sizeof(mesh_data_buf) - 1);

    char *z_offset_val = get_json_value(req->req_body, "\"z_offset\"");
    if (z_offset_val) strncpy(z_offset_buf, z_offset_val, sizeof(z_offset_buf) - 1);

    int has_mesh_data = (mesh_data_buf[0] != '\0');
    int has_z_offset = (z_offset_buf[0] != '\0');

    if (!has_mesh_data && !has_z_offset) {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"error\", \"message\": \"Invalid JSON payload. Missing 'mesh_data' or 'z_offset'.\"}");
      status_code = 400;
    } else {
      char fn_buf[512];
      if (is_current) {
        snprintf(fn_buf, sizeof(fn_buf), "/user/webfs/data_slot_%d.txt", slot_id);
      } else {
        char slots_dir[512];
        snprintf(slots_dir, sizeof(slots_dir), "/user/webfs/profiles/%d/slots", profile_id);
        mkdir_p(slots_dir);
        snprintf(fn_buf, sizeof(fn_buf), "%s/data_slot_%d.txt", slots_dir, slot_id);
      }

      // If only z_offset provided (partial update), read existing mesh_data from file
      if (!has_mesh_data && has_z_offset) {
        FILE *existing = fopen(fn_buf, "r");
        if (existing) {
          if (fgets(mesh_data_buf, sizeof(mesh_data_buf) - 1, existing) != NULL) {
            trim_trailing_whitespace(mesh_data_buf);
          }
          fclose(existing);
          has_mesh_data = (mesh_data_buf[0] != '\0');
        }
        if (!has_mesh_data) {
          snprintf(req->response_buffer, sizeof(req->response_buffer),
                  "{\"status\": \"error\", \"message\": \"Slot file not found for partial update.\"}");
          status_code = 404;
          req->body = req->response_buffer;
          req->lbody = strlen(req->response_buffer);
          req->mime = "application/json";
          mkheader(req, status_code);
          return;
        }
      }

      // Write file: line 1 = mesh_data, line 2 = z_offset (if provided)
      FILE *f = fopen(fn_buf, "wb");
      if (f) {
        fputs(mesh_data_buf, f);
        if (has_z_offset) {
          fputc('\n', f);
          fputs(z_offset_buf, f);
        }
        fclose(f);

        if (is_current) {
          LOG( "Mesh saved to slot %d\n", slot_id);
        } else {
          LOG( "Mesh saved to profile %d slot %d\n", profile_id, slot_id);
        }
        snprintf(req->response_buffer, sizeof(req->response_buffer),
                "{\"status\": \"success\", \"message\": \"Mesh saved to slot %d.\"}", slot_id);
        status_code = 200;
      } else {
        snprintf(req->response_buffer, sizeof(req->response_buffer),
                "{\"status\": \"error\", \"message\": \"Failed to write to file.\"}");
        status_code = 500;
      }
    }
  }
  req->body = req->response_buffer;
  req->lbody = strlen(req->response_buffer);
  req->mime = "application/json";
  mkheader(req, status_code);
}

// DELETE /api/profiles/{id}/slots/{n}
void handle_delete_profile_slot(struct REQUEST *req, const char *profile_id_str, int slot_id) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);
  int status_code = 200;

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID.\"}");
    status_code = 400;
  } else if (slot_id <= 0 || slot_id >= 100) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid slot ID.\"}");
    status_code = 400;
  } else if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    status_code = 404;
  } else {
    char fn_buf[512];
    if (is_current) {
      snprintf(fn_buf, sizeof(fn_buf), "/user/webfs/data_slot_%d.txt", slot_id);
    } else {
      snprintf(fn_buf, sizeof(fn_buf), "/user/webfs/profiles/%d/slots/data_slot_%d.txt", profile_id, slot_id);
    }

    if (remove(fn_buf) == 0) {
      // Log slot deletion
      if (is_current) {
        LOG( "Mesh slot %d deleted\n", slot_id);
      } else {
        LOG( "Profile %d mesh slot %d deleted\n", profile_id, slot_id);
      }
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"success\", \"message\": \"Mesh slot %d deleted.\"}", slot_id);
      status_code = 200;
    } else {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not delete mesh slot %d. It may not exist.\"}", slot_id);
      status_code = 404;
    }
  }
  req->body = req->response_buffer;
  req->lbody = strlen(req->response_buffer);
  req->mime = "application/json";
  mkheader(req, status_code);
}
