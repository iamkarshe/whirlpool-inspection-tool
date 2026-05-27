package wireguard

import (
	"fmt"

	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// KeyPair holds a WireGuard client keypair (base64 strings as in .conf files).
type KeyPair struct {
	PrivateKey string
	PublicKey  string
}

// GenerateKeyPair generates a new WireGuard keypair.
func GenerateKeyPair() (KeyPair, error) {
	priv, err := wgtypes.GeneratePrivateKey()
	if err != nil {
		return KeyPair{}, fmt.Errorf("generate private key: %w", err)
	}
	pub := priv.PublicKey()
	return KeyPair{
		PrivateKey: priv.String(),
		PublicKey:  pub.String(),
	}, nil
}
