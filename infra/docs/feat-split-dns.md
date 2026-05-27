We have an AWS infra created with Pulumi for Whirlpool PDI.

Current architecture:

- App URL: https://whirlpool-pdi-prod.scoptanalytics.in
- App EC2 private IP: 10.20.1.206
- App EC2 public Elastic IP is mapped in BigRock DNS
- VPN EC2 private IP: 10.20.1.182
- WireGuard VPN server public DNS: whirlpool-pdi-vpn.scoptanalytics.in
- WireGuard subnet: 10.44.0.0/24
- VPC CIDR: 10.20.0.0/16
- WireGuard client AllowedIPs: 10.20.0.0/16, 10.44.0.0/24
- VPN forwarding works now
- AWS source/destination check is disabled on VPN EC2
- Linux ip_forward is enabled
- NAT/MASQUERADE is working on correct AWS interface

Requirement:
Users must always open the app using:
https://whirlpool-pdi-prod.scoptanalytics.in

Behavior required:

- Without VPN: domain resolves to public Elastic IP, public app routes work, protected APIs are blocked by FastAPI middleware.
- With WireGuard VPN active: same domain should resolve privately to 10.20.1.206, so /api, /auth, /sso, /authorization-code work through VPN.

We want to set up split DNS on the WireGuard VPN server using dnsmasq.

Please guide me step by step to:

1. Install and configure dnsmasq on the VPN EC2.
2. Make dnsmasq listen on 10.44.0.1.
3. Resolve whirlpool-pdi-prod.scoptanalytics.in to 10.20.1.206 only for VPN clients.
4. Forward all other DNS queries to public resolvers.
5. Update WireGuard client config DNS from 1.1.1.1 to 10.44.0.1.
6. Test from Linux and Android.
7. Explain how this works with FastAPI middleware where LOGIN_VPN_IP should be the VPN EC2 private IP 10.20.1.182 because NAT makes FastAPI see VPN EC2 private IP.
8. Keep the instructions simple and production-safe.
