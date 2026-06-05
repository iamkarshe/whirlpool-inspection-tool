sudo useradd --system --create-home --shell /usr/sbin/nologin whirlpool

sudo cp *.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now redis-server
sudo systemctl enable --now whirlpool-api-fastapi whirlpool-api-celery whirlpool-api-flower


journalctl -u whirlpool-api-fastapi.service -f
journalctl -u whirlpool-api-celery.service -f
journalctl -u whirlpool-api-flower.service -f