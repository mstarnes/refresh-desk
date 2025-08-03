#!/bin/bash

# Set variables
DB_URI="mongodb://localhost:27017/refresh-desk"  # Replace with your MongoDB connection string (e.g., add username/password if needed: mongodb://user:pass@localhost:27017/refreshdesk)
BACKUP_DIR="./backups/$(date +%Y-%m-%d_%H-%M-%S)"  # Directory for backups, timestamped

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Run mongodump
mongodump --uri "$DB_URI" --out "$BACKUP_DIR"

# Check if successful
if [ $? -eq 0 ]; then
  echo "Backup complete: $BACKUP_DIR"
else
  echo "Backup failed!"
fi