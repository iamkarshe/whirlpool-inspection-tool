sudo visudo -f /etc/sudoers.d/whirlpool-api

scoptanalytics-whirlpool ALL=(root) NOPASSWD: /usr/bin/systemctl restart whirlpool-api.target
scoptanalytics-whirlpool ALL=(root) NOPASSWD: /usr/bin/systemctl start whirlpool-api.target
scoptanalytics-whirlpool ALL=(root) NOPASSWD: /usr/bin/systemctl stop whirlpool-api.target
scoptanalytics-whirlpool ALL=(root) NOPASSWD: /usr/bin/systemctl status whirlpool-api.target


sudo -u scoptanalytics-whirlpool -i
