CREATE TABLE IF NOT EXISTS vpn_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT,
    assigned_ip TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    revoked_at DATETIME,
    last_config_downloaded_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_vpn_devices_user_email ON vpn_devices(user_email);
CREATE INDEX IF NOT EXISTS idx_vpn_devices_is_active ON vpn_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_vpn_devices_assigned_ip ON vpn_devices(assigned_ip);

