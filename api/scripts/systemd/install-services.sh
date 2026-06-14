#!/usr/bin/env bash
set -euo pipefail

sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

sudo adduser --disabled-password --gecos "" scoptanalytics-whirlpool

getent passwd scoptanalytics-whirlpool

sudo mkdir -p /home/scoptanalytics-whirlpool/.ssh
sudo cp /home/ubuntu/.ssh/authorized_keys /home/scoptanalytics-whirlpool/.ssh/authorized_keys
sudo chown -R scoptanalytics-whirlpool:scoptanalytics-whirlpool /home/scoptanalytics-whirlpool/.ssh
sudo chmod 700 /home/scoptanalytics-whirlpool/.ssh
sudo chmod 600 /home/scoptanalytics-whirlpool/.ssh/authorized_keys

mkdir -p /home/scoptanalytics-whirlpool/htdocs/whirlpool.scoptanalytics.in
mkdir -p /home/scoptanalytics-whirlpool/tmp

cd /home/scoptanalytics-whirlpool/htdocs/whirlpool.scoptanalytics.in

curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.local/bin/env
uv --version
uv init .
uv venv
source .venv/bin/activate

mkdir -p /home/scoptanalytics-whirlpool/htdocs/whirlpool.scoptanalytics.in/logs
mkdir -p /home/scoptanalytics-whirlpool/htdocs/whirlpool.scoptanalytics.in/uploads

sudo cp ./*.service ./*.target /etc/systemd/system/

sudo systemctl daemon-reload

sudo systemctl enable --now redis-server.service

sudo visudo -f /etc/sudoers.d/whirlpool-api

which systemctl

scoptanalytics-whirlpool ALL=(root) NOPASSWD: /usr/bin/systemctl restart whirlpool-api.target
scoptanalytics-whirlpool ALL=(root) NOPASSWD: /usr/bin/systemctl start whirlpool-api.target
scoptanalytics-whirlpool ALL=(root) NOPASSWD: /usr/bin/systemctl stop whirlpool-api.target
scoptanalytics-whirlpool ALL=(root) NOPASSWD: /usr/bin/systemctl status whirlpool-api.target

sudo -u scoptanalytics-whirlpool -i

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