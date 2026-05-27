package wireguard

import "strings"

// ClientConfigParams are values for the client .conf template.
type ClientConfigParams struct {
	DevicePrivateKey    string
	DeviceIP            string
	ClientDNS           string
	ServerPublicKey     string
	ServerEndpoint      string
	ClientAllowedIPsCSV string
}

// RenderClientConfig produces a WireGuard client configuration (INI-style).
func RenderClientConfig(p ClientConfigParams) string {
	allowed := strings.TrimSpace(p.ClientAllowedIPsCSV)
	var b strings.Builder
	b.WriteString("[Interface]\n")
	b.WriteString("PrivateKey = " + strings.TrimSpace(p.DevicePrivateKey) + "\n")
	b.WriteString("Address = " + strings.TrimSpace(p.DeviceIP) + "/32\n")
	b.WriteString("DNS = " + strings.TrimSpace(p.ClientDNS) + "\n")
	b.WriteString("\n")
	b.WriteString("[Peer]\n")
	b.WriteString("PublicKey = " + strings.TrimSpace(p.ServerPublicKey) + "\n")
	b.WriteString("Endpoint = " + strings.TrimSpace(p.ServerEndpoint) + "\n")
	b.WriteString("AllowedIPs = " + allowed + "\n")
	b.WriteString("PersistentKeepalive = 25\n")
	return b.String()
}
