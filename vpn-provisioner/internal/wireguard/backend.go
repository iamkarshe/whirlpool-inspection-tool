package wireguard

// Peer is a WireGuard peer as seen on the server (mock or host).
type Peer struct {
	PublicKey string `json:"public_key"`
	AllowedIP string `json:"allowed_ip"`
}

// Backend abstracts adding/removing peers and reading server state.
// Use DockerBackend in local development; HostBackend in production; FakeBackend in tests.
type Backend interface {
	AddPeer(publicKey string, allowedIP string) error
	RemovePeer(publicKey string) error
	ShowPeers() ([]Peer, error)
	ServerPublicKey() (string, error)
}
