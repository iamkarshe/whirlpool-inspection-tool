#!/usr/bin/env bash
set -euo pipefail

sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

sudo cp ./*.service ./*.target /etc/systemd/system/

sudo systemctl daemon-reload

sudo systemctl enable --now redis-server.service

sudo systemctl enable whirlpool-api-fastapi.service
sudo systemctl enable whirlpool-api-celery.service
sudo systemctl enable whirlpool-api-flower.service
sudo systemctl enable whirlpool-api.target

sudo systemctl restart whirlpool-api.target

echo "Whirlpool API stack status:"
sudo systemctl --no-pager --full status whirlpool-api.target

echo
echo "Service status:"
sudo systemctl --no-pager --full status \
  whirlpool-api-fastapi.service \
  whirlpool-api-celery.service \
  whirlpool-api-flower.service