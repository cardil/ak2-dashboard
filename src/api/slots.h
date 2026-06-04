// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2024-2026 Chris Suszynski (@cardil)
//
#ifndef API_SLOTS_H
#define API_SLOTS_H

#include "../httpd.h"

// Slot operations
void handle_put_profile_slot(struct REQUEST *req, const char *profile_id_str, int slot_id);
void handle_delete_profile_slot(struct REQUEST *req, const char *profile_id_str, int slot_id);

#endif /* API_SLOTS_H */
