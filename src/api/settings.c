#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "../httpd.h"
#include "helpers.h"
#include "settings.h"

// External variables and functions from request.c
extern int read_mesh_from_printer_config(void);
extern int mesh_grid;
extern int detect_printer_defaults(const char **printer_model, const char **cfg_path, const char **cfg_filename, int *grid_size);
extern int update_printer_config_file(const char *config_file, const char *parameter_name, const char *replacement_value);
extern config_option_t leveling_config;
extern config_option_t set_key_value(config_option_t conf_opt, char *key, char *value);
extern int write_config_file(char *path, config_option_t conf_opt);
extern config_option_t read_config_file(char *path);

// External buffer from api.c
extern char api_response_buffer[8192];

// PUT /api/profiles/{id}/printer-mesh
void handle_put_profile_printer_mesh(struct REQUEST *req, const char *profile_id_str) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID.\"}");
    mkheader(req, 400);
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    return;
  }

  if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    mkheader(req, 404);
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    return;
  }

  if (req->req_body == NULL) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    mkheader(req, 400);
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    return;
  }

  char *mesh_data = get_json_value(req->req_body, "\"mesh_data\"");
  if (!mesh_data) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid JSON payload. Missing 'mesh_data'.\"}");
    mkheader(req, 400);
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    return;
  }

  const char *config_file;
  const char *cfg_filename;
  if (is_current) {
    if (detect_printer_defaults(NULL, &config_file, NULL, NULL) != 0) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration file.\"}");
      mkheader(req, 500);
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      return;
    }
  } else {
    if (detect_printer_defaults(NULL, NULL, &cfg_filename, NULL) != 0) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration.\"}");
      mkheader(req, 500);
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      return;
    }
    static char profile_cfg[512];
    snprintf(profile_cfg, sizeof(profile_cfg), "/user/webfs/profiles/%d/%s", profile_id, cfg_filename);
    config_file = profile_cfg;
  }

  if (update_printer_config_file(config_file, "points", mesh_data) == 0) {
    if (is_current) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"success\", \"message\": \"Active printer mesh updated. Please reboot for changes to take effect.\"}");
    } else {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"success\", \"message\": \"Profile mesh updated.\"}");
    }
    mkheader(req, 200);
  } else {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Failed to update printer configuration.\"}");
    mkheader(req, 500);
  }

  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
}

// PUT /api/profiles/{id}/settings
void handle_put_profile_settings(struct REQUEST *req, const char *profile_id_str) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID.\"}");
    mkheader(req, 400);
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    return;
  }

  if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    mkheader(req, 404);
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    return;
  }

  if (req->req_body == NULL) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    mkheader(req, 400);
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    return;
  }

  // Get the current state before making changes
  read_mesh_from_printer_config();
  int current_grid_size = mesh_grid;
  int grid_size_changed = 0;

  // Parse request body
  char body_copy[req->content_length + 1];
  strcpy(body_copy, req->req_body);

  char *grid_size_str = get_json_value(body_copy, "\"grid_size\"");
  strcpy(body_copy, req->req_body);
  char *bed_temp_str = get_json_value(body_copy, "\"bed_temp\"");
  strcpy(body_copy, req->req_body);
  char *precision_str = get_json_value(body_copy, "\"precision\"");

  const char *config_file;
  const char *cfg_filename;
  if (is_current) {
    if (detect_printer_defaults(NULL, &config_file, NULL, NULL) != 0) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration file.\"}");
      mkheader(req, 500);
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      return;
    }
  } else {
    if (detect_printer_defaults(NULL, NULL, &cfg_filename, NULL) != 0) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration.\"}");
      mkheader(req, 500);
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      return;
    }
    static char profile_cfg[512];
    snprintf(profile_cfg, sizeof(profile_cfg), "/user/webfs/profiles/%d/%s", profile_id, cfg_filename);
    config_file = profile_cfg;
  }

  if (grid_size_str) {
    int new_grid_size = atoi(grid_size_str);
    if (new_grid_size > 0 && new_grid_size != current_grid_size) {
      grid_size_changed = 1;

      // Create flat mesh
      char flat_mesh[4096] = {0};
      int len = 0;
      for (int i = 0; i < new_grid_size * new_grid_size; i++) {
        len += snprintf(flat_mesh + len, sizeof(flat_mesh) - len,
          "0.000000%s", (i == (new_grid_size * new_grid_size - 1)) ? "" : ", ");
      }
      update_printer_config_file(config_file, "points", flat_mesh);

      // Delete profile slots if changing settings
      if (!is_current) {
        char slots_dir[512];
        snprintf(slots_dir, sizeof(slots_dir), "/user/webfs/profiles/%d/slots", profile_id);
        if (dir_exists(slots_dir)) {
          rmdir_recursive(slots_dir);
        }
      } else {
        // Delete global slots
        for (int i = 1; i < 100; i++) {
          char fn_buf[64];
          snprintf(fn_buf, sizeof(fn_buf), "/user/webfs/data_slot_%d.txt", i);
          remove(fn_buf);
        }
      }

      // Update probe_count
      char replacement_value[8];
      snprintf(replacement_value, sizeof(replacement_value), "%d,%d", new_grid_size, new_grid_size);
      update_printer_config_file(config_file, "probe_count", replacement_value);
    }
  }

  if (bed_temp_str) {
    update_printer_config_file(config_file, "bed_mesh_temp", bed_temp_str);
  }

  if (precision_str && is_current) {
    if (!leveling_config) {
      leveling_config = read_config_file("/user/webfs/parameters.cfg");
    }
    leveling_config = set_key_value(leveling_config, "precision", precision_str);
    write_config_file("/user/webfs/parameters.cfg", leveling_config);
  }

  if (is_current) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"Settings updated. Please reboot for changes to take effect.\", \"grid_size_changed\": %s}",
            grid_size_changed ? "true" : "false");
  } else {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"Profile settings updated.\", \"grid_size_changed\": %s}",
            grid_size_changed ? "true" : "false");
  }
  mkheader(req, 200);
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
}
