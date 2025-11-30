#include <sys/socket.h>
#include <netinet/in.h>
#include <sys/stat.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include <dirent.h>
#include <unistd.h>
#include <time.h>

#define JSMN_STATIC
#define JSMN_PARENT_LINKS
#include "jsmn.h"

#include "../httpd.h"
#include "helpers.h"

// External variables and functions from request.c
extern config_option_t leveling_config;
extern config_option_t set_key_value(config_option_t conf_opt, char *key, char *value);
extern int write_config_file(char *path, config_option_t conf_opt);
extern config_option_t read_config_file(char *path);
extern char *get_key_value(config_option_t conf_opt, char *key, char *def_value);
extern int custom_copy_file(const char *from, const char *to, const char *mode, const char *buffer);

// Helper to trim trailing whitespace
void trim_trailing_whitespace(char *str) {
  if (str == NULL) return;
  int i = strlen(str) - 1;
  while (i >= 0 && isspace((unsigned char)str[i])) {
    str[i] = '\0';
    i--;
  }
}

// Helper to create directory recursively
int mkdir_p(const char *path) {
  char tmp[512];
  char *p = NULL;
  size_t len;

  snprintf(tmp, sizeof(tmp), "%s", path);
  len = strlen(tmp);
  if (tmp[len - 1] == '/')
    tmp[len - 1] = 0;
  for (p = tmp + 1; *p; p++) {
    if (*p == '/') {
      *p = 0;
      mkdir(tmp, 0755);
      *p = '/';
    }
  }
  return mkdir(tmp, 0755);
}

// Helper to check if directory exists
int dir_exists(const char *path) {
  struct stat st;
  return (stat(path, &st) == 0 && S_ISDIR(st.st_mode));
}

// Helper to check if file exists
int file_exists_api(const char *path) {
  struct stat st;
  return (stat(path, &st) == 0 && S_ISREG(st.st_mode));
}

// Helper to recursively delete directory
int rmdir_recursive(const char *path) {
  DIR *d = opendir(path);
  size_t path_len = strlen(path);
  int r = -1;

  if (d) {
    struct dirent *p;
    r = 0;
    while (!r && (p = readdir(d))) {
      int r2 = -1;
      char *buf;
      size_t len;

      if (!strcmp(p->d_name, ".") || !strcmp(p->d_name, ".."))
        continue;

      len = path_len + strlen(p->d_name) + 2;
      buf = malloc(len);
      if (buf) {
        struct stat statbuf;
        snprintf(buf, len, "%s/%s", path, p->d_name);
        if (!stat(buf, &statbuf)) {
          if (S_ISDIR(statbuf.st_mode))
            r2 = rmdir_recursive(buf);
          else
            r2 = unlink(buf);
        }
        free(buf);
      }
      r = r2;
    }
    closedir(d);
  }
  if (!r)
    r = rmdir(path);
  return r;
}

// Get loaded_from value from parameters.cfg
int get_loaded_from() {
  if (!leveling_config) {
    leveling_config = read_config_file("/user/webfs/parameters.cfg");
  }
  char *loaded_from_str = get_key_value(leveling_config, "loaded_from", "0");
  int loaded_from = atoi(loaded_from_str);
  return (loaded_from >= 1 && loaded_from <= 20) ? loaded_from : 0;
}

// Set loaded_from value in parameters.cfg
void set_loaded_from(int profile_id) {
  if (!leveling_config) {
    leveling_config = read_config_file("/user/webfs/parameters.cfg");
  }
  char value[8];
  if (profile_id >= 1 && profile_id <= 20) {
    snprintf(value, sizeof(value), "%d", profile_id);
  } else {
    snprintf(value, sizeof(value), "0");
  }
  leveling_config = set_key_value(leveling_config, "loaded_from", value);
  write_config_file("/user/webfs/parameters.cfg", leveling_config);
}

// Read profile metadata (name) using jsmn for robust JSON parsing
char* read_profile_name(int profile_id, char *buffer, size_t bufsize) {
  char path[256];
  snprintf(path, sizeof(path), "/user/webfs/profiles/%d/metadata.json", profile_id);

  FILE *f = fopen(path, "r");
  if (f) {
    // Read entire file (max 512 bytes for metadata)
    char content[512];
    size_t total_read = 0;
    int ch;
    while ((ch = fgetc(f)) != EOF && total_read < sizeof(content) - 1) {
      content[total_read++] = ch;
    }
    content[total_read] = '\0';
    fclose(f);

    // Parse JSON with jsmn
    jsmn_parser parser;
    jsmntok_t tokens[16];  // Enough for simple metadata
    jsmn_init(&parser);

    int token_count = jsmn_parse(&parser, content, total_read, tokens, 16);
    if (token_count >= 3) {  // At least: object, "name", value
      // Look for "name" key
      for (int i = 1; i < token_count - 1; i++) {
        if (tokens[i].type == JSMN_STRING) {
          int key_len = tokens[i].end - tokens[i].start;
          if (key_len == 4 && strncmp(content + tokens[i].start, "name", 4) == 0) {
            // Found "name" key, next token is the value
            if (i + 1 < token_count && tokens[i + 1].type == JSMN_STRING) {
              int value_len = tokens[i + 1].end - tokens[i + 1].start;
              if (value_len >= (int)bufsize) value_len = bufsize - 1;
              strncpy(buffer, content + tokens[i + 1].start, value_len);
              buffer[value_len] = '\0';
              return buffer;
            }
          }
        }
      }
    }
  }
  snprintf(buffer, bufsize, "Profile %d", profile_id);
  return buffer;
}

// Escape JSON string (handles quotes, backslashes, newlines, etc.)
void json_escape_string(const char *src, char *dst, size_t dst_size) {
  size_t j = 0;
  for (size_t i = 0; src[i] && j < dst_size - 2; i++) {
    switch (src[i]) {
      case '"':  dst[j++] = '\\'; dst[j++] = '"'; break;
      case '\\': dst[j++] = '\\'; dst[j++] = '\\'; break;
      case '\n': dst[j++] = '\\'; dst[j++] = 'n'; break;
      case '\r': dst[j++] = '\\'; dst[j++] = 'r'; break;
      case '\t': dst[j++] = '\\'; dst[j++] = 't'; break;
      default:   dst[j++] = src[i]; break;
    }
  }
  dst[j] = '\0';
}

// Write profile metadata (name) with proper JSON escaping
int write_profile_name(int profile_id, const char *name) {
  char path[256];
  char dir_path[256];
  snprintf(dir_path, sizeof(dir_path), "/user/webfs/profiles/%d", profile_id);
  snprintf(path, sizeof(path), "%s/metadata.json", dir_path);

  // Ensure directory exists
  mkdir_p(dir_path);

  // Escape the name for JSON
  char escaped_name[256];
  json_escape_string(name, escaped_name, sizeof(escaped_name));

  char json[512];
  snprintf(json, sizeof(json), "{\"name\": \"%s\"}", escaped_name);
  return custom_copy_file(NULL, path, "wb", json);
}

// Check if profile name exists (case-insensitive)
int profile_name_exists(const char *name, int exclude_id) {
  char lower_name[256];
  strncpy(lower_name, name, sizeof(lower_name) - 1);
  for (int i = 0; lower_name[i]; i++) {
    lower_name[i] = tolower(lower_name[i]);
  }

  for (int i = 1; i <= 20; i++) {
    if (i == exclude_id) continue;
    char profile_dir[256];
    snprintf(profile_dir, sizeof(profile_dir), "/user/webfs/profiles/%d", i);
    if (dir_exists(profile_dir)) {
      char profile_name[256];
      read_profile_name(i, profile_name, sizeof(profile_name));
      char lower_profile[256];
      strncpy(lower_profile, profile_name, sizeof(lower_profile) - 1);
      for (int j = 0; lower_profile[j]; j++) {
        lower_profile[j] = tolower(lower_profile[j]);
      }
      if (strcmp(lower_name, lower_profile) == 0) {
        return 1;
      }
    }
  }
  return 0;
}

// JSON parser using jsmn to find a value by key
char* get_json_value(char* json, const char* key) {
  jsmn_parser parser;
  jsmntok_t tokens[64];  // Enough for typical request bodies
  jsmn_init(&parser);

  int token_count = jsmn_parse(&parser, json, strlen(json), tokens, 64);
  if (token_count < 3) return NULL;

  size_t key_len = strlen(key);
  // Remove quotes if key includes them (e.g., "name" vs name)
  const char *clean_key = key;
  size_t clean_key_len = key_len;
  if (key_len > 2 && key[0] == '"' && key[key_len-1] == '"') {
    clean_key = key + 1;
    clean_key_len = key_len - 2;
  }

  // Look for key in object
  for (int i = 1; i < token_count - 1; i++) {
    if (tokens[i].type == JSMN_STRING) {
      int tok_len = tokens[i].end - tokens[i].start;
      if ((size_t)tok_len == clean_key_len &&
        strncmp(json + tokens[i].start, clean_key, clean_key_len) == 0) {
        // Found key, get value from next token
        if (i + 1 < token_count) {
          int value_start = tokens[i + 1].start;
          int value_end = tokens[i + 1].end;
          // Null-terminate the value in-place
          json[value_end] = '\0';
          return json + value_start;
        }
      }
    }
  }
  return NULL;
}

// Copy profile directory
int copy_profile_directory(const char *src_dir, const char *dst_dir) {
  mkdir_p(dst_dir);

  DIR *d = opendir(src_dir);
  if (!d) return -1;

  struct dirent *entry;
  int result = 0;

  while ((entry = readdir(d)) != NULL) {
    if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0)
      continue;

    char src_path[512];
    char dst_path[512];
    snprintf(src_path, sizeof(src_path), "%s/%s", src_dir, entry->d_name);
    snprintf(dst_path, sizeof(dst_path), "%s/%s", dst_dir, entry->d_name);

    struct stat st;
    if (stat(src_path, &st) == 0) {
      if (S_ISDIR(st.st_mode)) {
        if (copy_profile_directory(src_path, dst_path) != 0) {
          result = -1;
          break;
        }
      } else {
        if (custom_copy_file(src_path, dst_path, "wb", NULL) != 0) {
          result = -1;
          break;
        }
      }
    }
  }

  closedir(d);
  return result;
}

// Helper to check if profile directory exists
int dir_exists_profile(int profile_id) {
  char path[256];
  snprintf(path, sizeof(path), "/user/webfs/profiles/%d", profile_id);
  return dir_exists(path);
}

// Read slots from a directory and build JSON array
int read_slots_json(const char *slots_dir, char *buffer, int buffer_size, int *len) {
  int first_mesh = 1;
  for (int i = 1; i < 100; i++) {
    char fn_buf[512];
    snprintf(fn_buf, sizeof(fn_buf), "%s/data_slot_%d.txt", slots_dir, i);

    struct stat st;
    if (stat(fn_buf, &st) == 0) {
      FILE *file = fopen(fn_buf, "r");
      if (file) {
        if (!first_mesh) {
          *len += snprintf(buffer + *len, buffer_size - *len, ",");
        }
        char mesh_data[4096] = {0};
        fread(mesh_data, 1, sizeof(mesh_data) - 1, file);
        fclose(file);
        trim_trailing_whitespace(mesh_data);

        char date_buf[32];
        strftime(date_buf, sizeof(date_buf), "%Y-%m-%d %H:%M:%S", localtime(&st.st_mtime));

        *len += snprintf(buffer + *len, buffer_size - *len,
                        "{\"id\": %d, \"date\": \"%s\", \"mesh_data\": \"%s\"}",
                        i, date_buf, mesh_data);
        first_mesh = 0;
      }
    }
  }
  return 0;
}
