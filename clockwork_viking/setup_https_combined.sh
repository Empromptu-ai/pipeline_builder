#!/bin/bash
# Usage: sudo ./setup_https_combined.sh your.domain.com 8080 5000
# Args: domain web_server_port api_port
# BE SURE TO TURN ON PORTS 80 (temporary, for cert checking) and 443 (permanent)

DOMAIN=$1
WEB_PORT=$2
API_PORT=$3

if [ -z "$DOMAIN" ] || [ -z "$WEB_PORT" ] || [ -z "$API_PORT" ]; then
  echo "Usage: $0 <domain> <web_server_port> <api_port>"
  echo "Example: $0 builder.impromptu-labs.com 8080 5000"
  exit 1
fi

echo "Setting up HTTPS for $DOMAIN with web server on port $WEB_PORT and API on port $API_PORT..."

echo "Installing dependencies..."
apt update
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
    
    # API endpoint - routes /api_tools/ to your FastAPI server
    location /api_tools/ {
        proxy_pass http://127.0.0.1:$API_PORT/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Handle CORS if needed
        proxy_set_header Access-Control-Allow-Origin *;
    }
    
    # Web server - everything else goes to your main web server
    location / {
        proxy_pass http://127.0.0.1:$WEB_PORT/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

# Remove default nginx site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

echo "Testing and restarting Nginx..."
nginx -t && systemctl restart nginx

echo "Waiting 2 seconds for Nginx to settle..."
sleep 2

echo "Attempting to get SSL certificate for $DOMAIN..."
certbot --non-interactive --nginx -d $DOMAIN --agree-tos -m admin@$DOMAIN

echo "Done! Your services should now be available at:"
echo "  Web Server: https://$DOMAIN"
echo "  API:        https://$DOMAIN/api_tools/"
echo ""
echo "Make sure your FastAPI app is running on port $API_PORT"
echo "Make sure your web server is running on port $WEB_PORT"
