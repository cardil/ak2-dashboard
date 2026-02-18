#ifndef API_H
#define API_H

#include "httpd.h"

void handle_api_request(struct REQUEST *req, char *filename);
void handle_get_system(struct REQUEST *req);
void handle_post_security_password(struct REQUEST *req);
void handle_post_system_reboot(struct REQUEST *req);
void handle_post_system_ssh(struct REQUEST *req);

#endif /* API_H */
