#ifndef API_SETTINGS_H
#define API_SETTINGS_H

#include "../httpd.h"

// Settings and printer-mesh operations
void handle_put_profile_printer_mesh(struct REQUEST *req, const char *profile_id_str);
void handle_put_profile_settings(struct REQUEST *req, const char *profile_id_str);

#endif /* API_SETTINGS_H */
