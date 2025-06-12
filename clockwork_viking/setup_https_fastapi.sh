#!/bin/bash

# Usage: sudo ./setup_https_fastapi.sh your.domain.com 5000

# BE SURE TO TURN ON PORTS 80 (temporary, for cert checking) and  443 (permanent, as HTTPS endpoint) first!

DOMAIN=$1
PORT=$2


if [ -z "$DOMAIN" ] || [ -z "$PORT" ]; then
  echo "Usage: $0 <domain> <uvicorn_port>"
  exit 1
fi

echo "Installing dependencies..."
apt update
sudo apt install nginx
apt install -y nginx certbot python3-certbot-nginx

# Open ports 80 and 443 on ufw if it's installed
if command -v ufw &> /dev/null; then
  echo "UFW detected. Allowing HTTP and HTTPS traffic..."
  ufw allow 80
  ufw allow 443
fi

echo "Creating Nginx config for $DOMAIN..."
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

echo "Testing and restarting Nginx..."
nginx -t && systemctl restart nginx

echo "Waiting 2 seconds for Nginx to settle..."
sleep 2

echo "Attempting to get SSL certificate for $DOMAIN..."
certbot --non-interactive --nginx -d $DOMAIN --agree-tos -m admin@$DOMAIN

echo "Done! Your FastAPI app should now be available at: https://$DOMAIN"

