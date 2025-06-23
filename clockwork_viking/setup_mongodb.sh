#!/bin/bash

# Set your database and collection names
DATABASE_NAME="pipeline_db"
COLLECTION_NAME="data_objects"
PROMPTS_COLLECTION="prompts"

echo "Updating package list..."
sudo apt-get update

echo "Installing gnupg and curl if not present..."
sudo apt-get install -y gnupg curl

echo "Importing MongoDB public GPG Key..."
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
  --dearmor

echo "Creating MongoDB source list..."

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
echo "Updating packages again..."
sudo apt-get update

echo "Installing MongoDB..."
sudo apt-get install -y mongodb-org

echo "Starting MongoDB..."
sudo systemctl start mongod
sudo systemctl enable mongod

echo "Waiting for MongoDB to start..."
sleep 5

echo "Creating database '$DATABASE_NAME' and collection '$COLLECTION_NAME'..."
mongosh <<EOF
use $DATABASE_NAME
db.createCollection("$COLLECTION_NAME")
db.createCollection("$PROMPTS_COLLECTION")
EOF

echo "MongoDB is running at mongodb://localhost:27017"
