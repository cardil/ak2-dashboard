#ifndef API_HELPERS_H
#define API_HELPERS_H

#include <stddef.h>

// Directory and file operations
int mkdir_p(const char *path);
int dir_exists(const char *path);
int file_exists_api(const char *path);
int rmdir_recursive(const char *path);
int copy_profile_directory(const char *src_dir, const char *dst_dir);

// String utilities
void trim_trailing_whitespace(char *str);
void json_escape_string(const char *src, char *dst, size_t dst_size);

// JSON parsing (returns pointer to static buffer - NOT thread-safe)
char* get_json_value(const char* json, const char* key);

// Profile metadata
char* read_profile_name(int profile_id, char *buffer, size_t bufsize);
int write_profile_name(int profile_id, const char *name);
int profile_name_exists(const char *name, int exclude_id);

// Profile state
int get_loaded_from(void);
void set_loaded_from(int profile_id);

// Slot operations
int read_slots_json(const char *slots_dir, char *buffer, int buffer_size, int *len);

// Helper to check if profile directory exists
int dir_exists_profile(int profile_id);

#endif /* API_HELPERS_H */
