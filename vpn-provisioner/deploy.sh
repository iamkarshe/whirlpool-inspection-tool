#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p /opt/vpn-provisioner
sudo mv /tmp/vpn-provisioner /opt/vpn-provisioner/vpn-provisioner
sudo chmod +x /opt/vpn-provisioner/vpn-provisioner

sudo useradd --system --home /var/lib/vpn-provisioner --shell /usr/sbin/nologin vpnapi || true

sudo mkdir -p /var/lib/vpn-provisioner
sudo mkdir -p /etc/vpn-provisioner
sudo mkdir -p /var/log/vpn-provisioner

sudo chown -R vpnapi:vpnapi /var/lib/vpn-provisioner
sudo chown -R vpnapi:vpnapi /var/log/vpn-provisioner

sudo nano /etc/vpn-provisioner/vpn-provisioner.env

sudo chown root:vpnapi /etc/vpn-provisioner/vpn-provisioner.env
sudo chmod 640 /etc/vpn-provisioner/vpn-provisioner.env

sudo nano /usr/local/bin/vpn-add-peer
sudo nano /usr/local/bin/vpn-remove-peer
sudo nano /usr/local/bin/vpn-show-peers
sudo nano /usr/local/bin/vpn-server-public-key

sudo chmod +x /usr/local/bin/vpn-add-peer
sudo chmod +x /usr/local/bin/vpn-remove-peer
sudo chmod +x /usr/local/bin/vpn-show-peers
sudo chmod +x /usr/local/bin/vpn-server-public-key

sudo visudo -f /etc/sudoers.d/vpn-provisioner
vpnapi ALL=(root) NOPASSWD: /usr/local/bin/vpn-add-peer, /usr/local/bin/vpn-remove-peer, /usr/local/bin/vpn-show-peers, /usr/local/bin/vpn-server-public-key
sudo chmod 0440 /etc/sudoers.d/vpn-provisioner
sudo chown root:root /etc/sudoers.d/vpn-provisioner
sudo visudo -c

sudo nano /etc/systemd/system/vpn-provisioner.service

sudo systemctl daemon-reload
sudo systemctl enable vpn-provisioner
sudo systemctl start vpn-provisioner
sudo systemctl status vpn-provisioner

sudo journalctl -u vpn-provisioner -f