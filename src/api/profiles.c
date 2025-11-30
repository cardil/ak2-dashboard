#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <dirent.h>

#include "../httpd.h"
#include "helpers.h"
#include "profiles.h"

// External variables and functions from request.c
extern int read_mesh_from_printer_config(void);
extern int mesh_grid;
extern int bed_temp;
extern double z_offset;
extern char mesh_config[];
extern double precision;
extern int detect_printer_defaults(const char **printer_model, const char **cfg_path, const char **cfg_filename, int *grid_size);
extern int custom_copy_file(const char *from, const char *to, const char *mode, const char *buffer);

// External buffer from api.c
extern char api_response_buffer[8192];

// GET /api/profiles - List all profiles
void handle_get_profiles(struct REQUEST *req) {
  int loaded_from = get_loaded_from();

  int len = snprintf(api_response_buffer, sizeof(api_response_buffer),
          "{\"loaded_from\": %d, \"profiles\": [", loaded_from);

  int first = 1;
  for (int i = 1; i <= 20; i++) {
    char profile_dir[256];
    snprintf(profile_dir, sizeof(profile_dir), "/user/webfs/profiles/%d", i);
    if (dir_exists(profile_dir)) {
      if (!first) {
        len += snprintf(api_response_buffer + len, sizeof(api_response_buffer) - len, ",");
      }
      char name[256];
      read_profile_name(i, name, sizeof(name));
      len += snprintf(api_response_buffer + len, sizeof(api_response_buffer) - len,
        "{\"id\": %d, \"name\": \"%s\"}", i, name);
      first = 0;
    }
  }

  len += snprintf(api_response_buffer + len, sizeof(api_response_buffer) - len, "]}");

  req->body = api_response_buffer;
  req->lbody = len;
  req->mime = "application/json";
  mkheader(req, 200);
}

// GET /api/profiles/current or GET /api/profiles/{id}
void handle_get_profile(struct REQUEST *req, const char *profile_id_str) {
  int is_current = (strcmp(profile_id_str, "current") == 0);
  int profile_id = is_current ? 0 : atoi(profile_id_str);

  if (!is_current && (profile_id < 1 || profile_id > 20)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID. Must be 1-20.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  if (!is_current && !dir_exists_profile(profile_id)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 404);
    return;
  }

  // Read current mesh data
  read_mesh_from_printer_config();
  trim_trailing_whitespace(mesh_config);

  int len = snprintf(api_response_buffer, sizeof(api_response_buffer),
          "{");

  if (!is_current) {
    char name[256];
    read_profile_name(profile_id, name, sizeof(name));
    len += snprintf(api_response_buffer + len, sizeof(api_response_buffer) - len,
      "\"id\": %d, \"name\": \"%s\", ", profile_id, name);
  }

  len += snprintf(api_response_buffer + len, sizeof(api_response_buffer) - len,
          "\"settings\": {"
          "\"grid_size\": %d,"
          "\"bed_temp\": %d,"
          "\"precision\": %.4f,"
          "\"z_offset\": %.4f"
          "},"
          "\"active_mesh\": {"
          "\"mesh_data\": \"%s\""
          "},"
          "\"saved_meshes\": [",
          mesh_grid, bed_temp, precision, z_offset, mesh_config);

  // Read slots
  const char *slots_dir = is_current ? "/user/webfs" : NULL;
  if (!is_current) {
    static char profile_slots_dir[512];
    snprintf(profile_slots_dir, sizeof(profile_slots_dir), "/user/webfs/profiles/%d/slots", profile_id);
    slots_dir = profile_slots_dir;
  }

  read_slots_json(slots_dir, api_response_buffer, sizeof(api_response_buffer), &len);

  len += snprintf(api_response_buffer + len, sizeof(api_response_buffer) - len, "]}");

  req->body = api_response_buffer;
  req->lbody = len;
  req->mime = "application/json";
  mkheader(req, 200);
}

// PUT /api/profiles/{id} - Update profile name
void handle_put_profile(struct REQUEST *req, const char *profile_id_str) {
  int profile_id = atoi(profile_id_str);
  int status_code = 200;

  if (profile_id < 1 || profile_id > 20) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID. Must be 1-20.\"}");
    status_code = 400;
  } else if (!dir_exists_profile(profile_id)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    status_code = 404;
  } else if (req->req_body == NULL) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    status_code = 400;
  } else {
    char *name = get_json_value(req->req_body, "\"name\"");
    if (!name || strlen(name) == 0) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Missing or empty name.\"}");
      status_code = 400;
    } else if (strlen(name) > 50) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Name too long. Maximum 50 characters.\"}");
      status_code = 400;
    } else if (profile_name_exists(name, profile_id)) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"A profile with this name already exists\"}");
      status_code = 400;
    } else {
      if (write_profile_name(profile_id, name) == 0) {
        snprintf(api_response_buffer, sizeof(api_response_buffer),
                "{\"status\": \"success\", \"message\": \"Profile name updated.\"}");
        status_code = 200;
      } else {
        snprintf(api_response_buffer, sizeof(api_response_buffer),
                "{\"status\": \"error\", \"message\": \"Failed to update profile name.\"}");
        status_code = 500;
      }
    }
  }
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, status_code);
}

// DELETE /api/profiles/{id}
void handle_delete_profile(struct REQUEST *req, const char *profile_id_str) {
  int profile_id = atoi(profile_id_str);
  int status_code = 200;

  if (profile_id < 1 || profile_id > 20) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid profile ID. Must be 1-20.\"}");
    status_code = 400;
  } else if (!dir_exists_profile(profile_id)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Profile not found\"}");
    status_code = 404;
  } else {
    char profile_dir[256];
    snprintf(profile_dir, sizeof(profile_dir), "/user/webfs/profiles/%d", profile_id);

    if (rmdir_recursive(profile_dir) == 0) {
      // Clear loaded_from if this was the loaded profile
      int loaded_from = get_loaded_from();
      if (loaded_from == profile_id) {
        set_loaded_from(0);
      }

      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"success\", \"message\": \"Profile deleted.\"}");
      status_code = 200;
    } else {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Failed to delete profile.\"}");
      status_code = 500;
    }
  }
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, status_code);
}

// POST /api/profiles/{id}/save-as
void handle_post_save_as(struct REQUEST *req, const char *source_id_str) {
  int is_source_current = (strcmp(source_id_str, "current") == 0);
  int source_id = is_source_current ? 0 : atoi(source_id_str);

  if (!is_source_current && (source_id < 1 || source_id > 20)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Invalid source profile ID.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  if (!is_source_current && !dir_exists_profile(source_id)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Source profile not found\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 404);
    return;
  }

  if (req->req_body == NULL) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing request body.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  // Note: get_json_value uses a static buffer, so we must copy values before subsequent calls
  char target[64] = {0};
  char name[256] = {0};

  char *target_val = get_json_value(req->req_body, "\"target\"");
  if (target_val) {
    strncpy(target, target_val, sizeof(target) - 1);
  }

  char *name_val = get_json_value(req->req_body, "\"name\"");
  if (name_val) {
    strncpy(name, name_val, sizeof(name) - 1);
  }

  if (target[0] == '\0') {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Missing target parameter.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  int is_target_current = (strcmp(target, "current") == 0);
  int is_target_new = (strcmp(target, "new") == 0);
  int target_id = (!is_target_current && !is_target_new) ? atoi(target) : 0;

  // Validation
  if (is_source_current && is_target_current) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Cannot save current to current.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  if (!is_source_current && !is_target_current && !is_target_new && source_id == target_id) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Cannot save profile to itself.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  if (is_target_new && strlen(name) == 0) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"Name required when creating new profile.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  if (is_target_new && profile_name_exists(name, 0)) {
    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"error\", \"message\": \"A profile with this name already exists\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 400);
    return;
  }

  // Find free slot for new profile
  if (is_target_new) {
    int found = 0;
    for (int i = 1; i <= 20; i++) {
      if (!dir_exists_profile(i)) {
        target_id = i;
        found = 1;
        break;
      }
    }
    if (!found) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Maximum of 20 profiles reached\"}");
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      mkheader(req, 400);
      return;
    }
  }

  // Handle save-as to current (apply profile)
  if (is_target_current) {
    char src_dir[512];
    snprintf(src_dir, sizeof(src_dir), "/user/webfs/profiles/%d", source_id);

    const char *cfg_path;
    const char *cfg_filename;
    if (detect_printer_defaults(NULL, &cfg_path, &cfg_filename, NULL) != 0) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration.\"}");
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }

    char src_printer_cfg[512];
    char src_unmodifiable_cfg[512];
    snprintf(src_printer_cfg, sizeof(src_printer_cfg), "%s/%s", src_dir, cfg_filename);
    snprintf(src_unmodifiable_cfg, sizeof(src_unmodifiable_cfg), "%s/unmodifiable.cfg", src_dir);

    if (!file_exists_api(src_printer_cfg)) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Profile is corrupted. Cannot apply.\"}");
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      mkheader(req, 400);
      return;
    }

    // Delete all global slots
    for (int i = 1; i < 100; i++) {
      char slot_path[256];
      snprintf(slot_path, sizeof(slot_path), "/user/webfs/data_slot_%d.txt", i);
      remove(slot_path);
    }

    // Copy profile files to /user/
    if (custom_copy_file(src_printer_cfg, cfg_path, "wb", NULL) != 0) {
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Failed to copy printer configuration.\"}");
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }

    if (file_exists_api(src_unmodifiable_cfg)) {
      custom_copy_file(src_unmodifiable_cfg, "/user/unmodifiable.cfg", "wb", NULL);
    }

    // Copy slots if they exist
    char src_slots_dir[512];
    snprintf(src_slots_dir, sizeof(src_slots_dir), "%s/slots", src_dir);
    if (dir_exists(src_slots_dir)) {
      DIR *d = opendir(src_slots_dir);
      if (d) {
        struct dirent *entry;
        while ((entry = readdir(d)) != NULL) {
          if (strncmp(entry->d_name, "data_slot_", 10) == 0) {
            char src_slot[512];
            char dst_slot[256];
            snprintf(src_slot, sizeof(src_slot), "%s/%s", src_slots_dir, entry->d_name);
            snprintf(dst_slot, sizeof(dst_slot), "/user/webfs/%s", entry->d_name);
            custom_copy_file(src_slot, dst_slot, "wb", NULL);
          }
        }
        closedir(d);
      }
    }

    // Set loaded_from
    set_loaded_from(source_id);

    snprintf(api_response_buffer, sizeof(api_response_buffer),
            "{\"status\": \"success\", \"message\": \"Profile applied to printer. Please reboot for changes to take effect.\"}");
    req->body = api_response_buffer;
    req->lbody = strlen(api_response_buffer);
    req->mime = "application/json";
    mkheader(req, 200);
    return;
  }

  // Handle save-as to new or existing profile
  char dst_dir[512];
  snprintf(dst_dir, sizeof(dst_dir), "/user/webfs/profiles/%d", target_id);

  // Create destination directory
  mkdir_p(dst_dir);

  // Copy from current or from another profile
  if (is_source_current) {
    const char *cfg_path;
    const char *cfg_filename;
    if (detect_printer_defaults(NULL, &cfg_path, &cfg_filename, NULL) != 0) {
      rmdir_recursive(dst_dir);
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Could not detect printer configuration.\"}");
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }

    char dst_printer_cfg[512];
    char dst_unmodifiable_cfg[512];
    snprintf(dst_printer_cfg, sizeof(dst_printer_cfg), "%s/%s", dst_dir, cfg_filename);
    snprintf(dst_unmodifiable_cfg, sizeof(dst_unmodifiable_cfg), "%s/unmodifiable.cfg", dst_dir);

    if (custom_copy_file(cfg_path, dst_printer_cfg, "wb", NULL) != 0 ||
        custom_copy_file("/user/unmodifiable.cfg", dst_unmodifiable_cfg, "wb", NULL) != 0) {
      rmdir_recursive(dst_dir);
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Failed to copy configuration files.\"}");
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }

    // Copy global slots to profile slots
    char dst_slots_dir[512];
    snprintf(dst_slots_dir, sizeof(dst_slots_dir), "%s/slots", dst_dir);
    mkdir_p(dst_slots_dir);

    for (int i = 1; i < 100; i++) {
      char src_slot[256];
      char dst_slot[512];
      snprintf(src_slot, sizeof(src_slot), "/user/webfs/data_slot_%d.txt", i);
      snprintf(dst_slot, sizeof(dst_slot), "%s/data_slot_%d.txt", dst_slots_dir, i);
      if (file_exists_api(src_slot)) {
        custom_copy_file(src_slot, dst_slot, "wb", NULL);
      }
    }
  } else {
    // Copy from another profile
    char src_dir[512];
    snprintf(src_dir, sizeof(src_dir), "/user/webfs/profiles/%d", source_id);

    if (copy_profile_directory(src_dir, dst_dir) != 0) {
      rmdir_recursive(dst_dir);
      snprintf(api_response_buffer, sizeof(api_response_buffer),
              "{\"status\": \"error\", \"message\": \"Failed to copy profile.\"}");
      req->body = api_response_buffer;
      req->lbody = strlen(api_response_buffer);
      req->mime = "application/json";
      mkheader(req, 500);
      return;
    }
  }

  // Set name if creating new profile
  if (is_target_new && strlen(name) > 0) {
    write_profile_name(target_id, name);
  }

  snprintf(api_response_buffer, sizeof(api_response_buffer),
          "{\"status\": \"success\", \"message\": \"Profile saved.\", \"id\": %d}", target_id);
  req->body = api_response_buffer;
  req->lbody = strlen(api_response_buffer);
  req->mime = "application/json";
  mkheader(req, 201);
}
