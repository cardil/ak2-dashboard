#ifndef API_SLOTS_H
#define API_SLOTS_H

#include "../httpd.h"

// Slot operations
void handle_put_profile_slot(struct REQUEST *req, const char *profile_id_str, int slot_id);
void handle_delete_profile_slot(struct REQUEST *req, const char *profile_id_str, int slot_id);

#endif /* API_SLOTS_H */
