package httpapi

import (
	"net/http"

	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/wireguard"
)

// WireGuardPeers returns JSON: { "peers": [...] } from the configured Backend.
func WireGuardPeers(backend wireguard.Backend) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if backend == nil {
			Error(w, http.StatusInternalServerError, "Internal error")
			return
		}
		peers, err := backend.ShowPeers()
		if err != nil {
			ErrorCause(w, http.StatusBadGateway, "WireGuard operation failed", err)
			return
		}
		JSON(w, http.StatusOK, map[string]any{"peers": peers})
	}
}
