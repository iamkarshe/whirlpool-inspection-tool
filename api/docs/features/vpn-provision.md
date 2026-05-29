- Health of service

```bash
curl --request GET \
  --url [VPN_PROVISION_SERVER]/health \
  --header 'authorization: Bearer [VPN_PROVISION_KEY]'
```

- Make device

```bash
curl --request POST \
  --url [VPN_PROVISION_SERVER]/v1/devices \
  --header 'authorization: Bearer [VPN_PROVISION_KEY]' \
  --header 'content-type: application/json' \
  --data '{
  "user_name": "Whirlpool User 01",
  "user_email": "user01@whirlpool.com",
  "device_name": "Android Phone",
  "device_type": "android"
}'
```

- List active devices

```bash
curl --request GET \
  --url [VPN_PROVISION_SERVER]/v1/devices \
  --header 'authorization: Bearer [VPN_PROVISION_KEY]'
```

- Get VPN config for device

```bash
curl --request GET \
  --url [VPN_PROVISION_SERVER]/v1/devices/[DEVICE_UUID]/config \
  --header 'authorization: Bearer [VPN_PROVISION_KEY]'
```

- Get VPN QR code for device

```bash
curl --request GET \
  --url [VPN_PROVISION_SERVER]/v1/devices/[DEVICE_UUID]/qr \
  --header 'authorization: Bearer [VPN_PROVISION_KEY]'
```

- Revoke/remove device

```bash
curl --request GET \
  --url [VPN_PROVISION_SERVER]/v1/devices/[DEVICE_UUID]/revoke \
  --header 'authorization: Bearer [VPN_PROVISION_KEY]'
```

- Get connected peers details

```bash
curl --request GET \
  --url [VPN_PROVISION_SERVER]/v1/wireguard/peers \
  --header 'authorization: Bearer [VPN_PROVISION_KEY]'
```
