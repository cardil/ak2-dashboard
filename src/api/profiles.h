#ifndef API_PROFILES_H
#define API_PROFILES_H

#include "../httpd.h"

// Profile CRUD operations
void handle_get_profiles(struct REQUEST *req);
void handle_get_profile(struct REQUEST *req, const char *profile_id_str);
void handle_put_profile(struct REQUEST *req, const char *profile_id_str);
void handle_delete_profile(struct REQUEST *req, const char *profile_id_str);
void handle_post_save_as(struct REQUEST *req, const char *source_id_str);

#endif /* API_PROFILES_H */
