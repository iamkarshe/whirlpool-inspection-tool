package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type Handlers struct {
	Health         http.HandlerFunc
	Devices        http.Handler
	WireGuardPeers http.HandlerFunc
}

type RouterDeps struct {
	AdminAPIKey string
	Handlers    Handlers
}

func NewRouter(d RouterDeps) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.NoCache)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		JSON(w, http.StatusOK, map[string]string{"message": "vpn-provisioner api"})
	})
	r.Get("/health", d.Handlers.Health)

	r.Route("/v1", func(v1 chi.Router) {
		v1.Use(AdminAPIKeyAuth(d.AdminAPIKey))

		if d.Handlers.Devices != nil {
			v1.Mount("/devices", d.Handlers.Devices)
		}
		if d.Handlers.WireGuardPeers != nil {
			v1.Get("/wireguard/peers", d.Handlers.WireGuardPeers)
		}
	})

	return r
}
