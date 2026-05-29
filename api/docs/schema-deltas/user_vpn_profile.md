# User VPN profile (`users` table)

One VPN provision device per user. Application code stores the provision server device UUID on the user row.

```sql
ALTER TABLE users
  ADD COLUMN vpn_device_uuid UUID NULL,
  ADD COLUMN vpn_device_name VARCHAR(200) NULL,
  ADD COLUMN vpn_device_type VARCHAR(64) NULL,
  ADD COLUMN vpn_provisioned_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX uq_users_vpn_device_uuid ON users (vpn_device_uuid);
```

`vpn_device_uuid` is nullable and unique so each provisioned device maps to at most one user; many users may have no VPN profile.
