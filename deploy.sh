#!/bin/bash
set -e

cd /var/www/har-habituach

echo "Pulling latest code..."
git pull origin master

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Copying static files to standalone..."
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo "Restarting PM2..."
pm2 restart har-habituach || pm2 start ecosystem.config.js
pm2 save

echo "Done! App running on port 3100"
