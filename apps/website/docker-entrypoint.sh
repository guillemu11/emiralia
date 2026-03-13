#!/bin/sh
set -e

# Use Railway's PORT env var, default to 80
export NGINX_PORT=${PORT:-80}

# Replace port in nginx config
sed -i "s/listen 80;/listen ${NGINX_PORT};/g" /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
