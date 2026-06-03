sudo cp deploy/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now redis-server
sudo systemctl enable --now whirlpool-api-fastapi whirlpool-api-celery whirlpool-api-flower