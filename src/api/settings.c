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

// PUT /api/profiles/{id}/printer-mesh
void handle_put_profile_printer_mesh(struct REQUEST *req, const char *profile_id_str) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);
  int status_code = 200;

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID.\"}");
    req->body = req->response_buffer;
    req->lbody = strlen(req->response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    req->body = req->response_buffer;
    req->lbody = strlen(req->response_buffer);
    req->mime = "application/json";
    mkheader(req, 404);
    return;
  }

  if (req->req_body == NULL) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    req->body = req->response_buffer;
    req->lbody = strlen(req->response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  char *mesh_data = get_json_value(req->req_body, "\"mesh_data\"");
  if (!mesh_data) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid JSON payload. Missing 'mesh_data'.\"}");
    req->body = req->response_buffer;
    req->lbody = strlen(req->response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  const char *config_file;
  const char *cfg_filename;
  if (is_current) {
    if (detect_printer_defaults(NULL, &config_file, NULL, NULL) != 0) {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration file.\"}");
      req->body = req->response_buffer;
      req->lbody = strlen(req->response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }
  } else {
    if (detect_printer_defaults(NULL, NULL, &cfg_filename, NULL) != 0) {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration.\"}");
      req->body = req->response_buffer;
      req->lbody = strlen(req->response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }
    static char profile_cfg[512];
    snprintf(profile_cfg, sizeof(profile_cfg), "/user/webfs/profiles/%d/%s", profile_id, cfg_filename);
    config_file = profile_cfg;
  }

  if (update_printer_config_file(config_file, "points", mesh_data) == 0) {
    if (is_current) {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"success\", \"message\": \"Active printer mesh updated. Please reboot for changes to take effect.\"}");
    } else {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"success\", \"message\": \"Profile mesh updated.\"}");
    }
    status_code = 200;
  } else {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Failed to update printer configuration.\"}");
    status_code = 500;
  }

  req->body = req->response_buffer;
  req->lbody = strlen(req->response_buffer);
  req->mime = "application/json";
  mkheader(req, status_code);
}

// PUT /api/profiles/{id}/settings
void handle_put_profile_settings(struct REQUEST *req, const char *profile_id_str) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID.\"}");
    req->body = req->response_buffer;
    req->lbody = strlen(req->response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    req->body = req->response_buffer;
    req->lbody = strlen(req->response_buffer);
    req->mime = "application/json";
    mkheader(req, 404);
    return;
  }

  if (req->req_body == NULL) {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    req->body = req->response_buffer;
    req->lbody = strlen(req->response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  // Get the current state before making changes
  read_mesh_from_printer_config();
  int current_grid_size = mesh_grid;
  int grid_size_changed = 0;

  // Parse request body
  // Note: get_json_value() uses a static buffer, so we must copy values immediately
  char body_copy[req->content_length + 1];

  // Get grid_size and copy to local buffer
  strcpy(body_copy, req->req_body);
  char grid_size_buf[16] = {0};
  char *tmp = get_json_value(body_copy, "\"grid_size\"");
  if (tmp) strncpy(grid_size_buf, tmp, sizeof(grid_size_buf) - 1);
  char *grid_size_str = grid_size_buf[0] ? grid_size_buf : NULL;

  // Get bed_temp and copy to local buffer
  strcpy(body_copy, req->req_body);
  char bed_temp_buf[16] = {0};
  tmp = get_json_value(body_copy, "\"bed_temp\"");
  if (tmp) strncpy(bed_temp_buf, tmp, sizeof(bed_temp_buf) - 1);
  char *bed_temp_str = bed_temp_buf[0] ? bed_temp_buf : NULL;

  // Get precision and copy to local buffer
  strcpy(body_copy, req->req_body);
  char precision_buf[16] = {0};
  tmp = get_json_value(body_copy, "\"precision\"");
  if (tmp) strncpy(precision_buf, tmp, sizeof(precision_buf) - 1);
  char *precision_str = precision_buf[0] ? precision_buf : NULL;

  const char *config_file;
  const char *cfg_filename;
  if (is_current) {
    if (detect_printer_defaults(NULL, &config_file, NULL, NULL) != 0) {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration file.\"}");
      req->body = req->response_buffer;
      req->lbody = strlen(req->response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }
  } else {
    if (detect_printer_defaults(NULL, NULL, &cfg_filename, NULL) != 0) {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration.\"}");
      req->body = req->response_buffer;
      req->lbody = strlen(req->response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
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
      if (update_printer_config_file(config_file, "points", flat_mesh) != 0) {
        snprintf(req->response_buffer, sizeof(req->response_buffer),
                "{\"status\": \"error\", \"message\": \"Failed to update mesh points.\"}");
        req->body = req->response_buffer;
        req->lbody = strlen(req->response_buffer);
        req->mime = "application/json";
        mkheader(req, 500);
        return;
      }

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
      if (update_printer_config_file(config_file, "probe_count", replacement_value) != 0) {
        snprintf(req->response_buffer, sizeof(req->response_buffer),
                "{\"status\": \"error\", \"message\": \"Failed to update probe_count.\"}");
        req->body = req->response_buffer;
        req->lbody = strlen(req->response_buffer);
        req->mime = "application/json";
        mkheader(req, 500);
        return;
      }
    }
  }

  if (bed_temp_str) {
    if (update_printer_config_file(config_file, "bed_mesh_temp", bed_temp_str) != 0) {
      snprintf(req->response_buffer, sizeof(req->response_buffer),
              "{\"status\": \"error\", \"message\": \"Failed to update bed_mesh_temp.\"}");
      req->body = req->response_buffer;
      req->lbody = strlen(req->response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }
  }

  if (precision_str) {
    char params_file[512];
    if (is_current) {
      snprintf(params_file, sizeof(params_file), "/user/webfs/parameters.cfg");
    } else {
      snprintf(params_file, sizeof(params_file), "/user/webfs/profiles/%d/parameters.cfg", profile_id);
    }

    if (!leveling_config) {
      leveling_config = read_config_file(params_file);
    }
    leveling_config = set_key_value(leveling_config, "precision", precision_str);
    write_config_file(params_file, leveling_config);
    LOG( "Leveling precision set to %s in %s\n", precision_str, params_file);
  }

  // Log settings update
  if (is_current) {
    LOG( "Settings updated (grid_changed=%s)\n", grid_size_changed ? "yes" : "no");
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"success\", \"message\": \"Settings updated. Please reboot for changes to take effect.\", \"grid_size_changed\": %s}",
            grid_size_changed ? "true" : "false");
  } else {
    snprintf(req->response_buffer, sizeof(req->response_buffer),
            "{\"status\": \"success\", \"message\": \"Profile settings updated.\", \"grid_size_changed\": %s}",
            grid_size_changed ? "true" : "false");
  }
  req->body = req->response_buffer;
  req->lbody = strlen(req->response_buffer);
  req->mime = "application/json";
  mkheader(req, 200);
}
