package wireguard

import (
	"fmt"
	"strings"

	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/config"
)

// NewFromConfig selects Backend from WG_BACKEND: docker | host | fake.
func NewFromConfig(cfg config.Config) (Backend, error) {
	switch strings.ToLower(strings.TrimSpace(cfg.WGBackend)) {
	case "docker":
		return NewDockerBackend(cfg.WGDockerContainer, cfg.WGInterface), nil
	case "host":
		return NewHostBackend(cfg.WGInterface), nil
	case "fake":
		// Tests can inject a custom fake via service; this branch is for completeness.
		return NewFakeBackend(""), nil
	default:
		return nil, fmt.Errorf("unknown WG_BACKEND: %q (use docker, host, or fake)", cfg.WGBackend)
	}
}
