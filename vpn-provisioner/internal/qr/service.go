package qr

import (
	"github.com/skip2/go-qrcode"
)

// ConfigPNG encodes the full WireGuard client config as a QR PNG.
func ConfigPNG(wgConfig string) ([]byte, error) {
	return qrcode.Encode(wgConfig, qrcode.Medium, 256)
}
