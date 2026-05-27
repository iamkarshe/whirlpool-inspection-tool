package devices

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"

	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/httpapi"
	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/qr"
)

// NewHandler registers REST routes under / (mount at /v1/devices).
func NewHandler(svc *Service) http.Handler {
	r := chi.NewRouter()
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		list, err := svc.List(req.Context())
		if err != nil {
			httpapi.Error(w, http.StatusInternalServerError, "Internal error")
			return
		}
		httpapi.JSON(w, http.StatusOK, list)
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var in CreateDeviceInput
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			httpapi.Error(w, http.StatusBadRequest, "Invalid JSON")
			return
		}
		sum, err := svc.Create(req.Context(), in)
		if err != nil {
			writeServiceErr(w, err)
			return
		}
		httpapi.JSON(w, http.StatusOK, sum)
	})
	r.Route("/{uuid}", func(sr chi.Router) {
		sr.Get("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "uuid")
			sum, err := svc.Get(req.Context(), id)
			if err != nil {
				writeNotFound(w, err)
				return
			}
			httpapi.JSON(w, http.StatusOK, sum)
		})
		sr.Get("/config", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "uuid")
			cfg, err := svc.ClientConfig(req.Context(), id)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					httpapi.Error(w, http.StatusNotFound, "Not found")
					return
				}
				if strings.Contains(err.Error(), "device inactive") {
					httpapi.Error(w, http.StatusBadRequest, "Device is inactive")
					return
				}
				httpapi.Error(w, http.StatusInternalServerError, "Internal error")
				return
			}
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(cfg))
		})
		sr.Get("/qr", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "uuid")
			cfg, err := svc.ClientConfig(req.Context(), id)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					httpapi.Error(w, http.StatusNotFound, "Not found")
					return
				}
				if strings.Contains(err.Error(), "device inactive") {
					httpapi.Error(w, http.StatusBadRequest, "Device is inactive")
					return
				}
				httpapi.Error(w, http.StatusInternalServerError, "Internal error")
				return
			}
			png, err := qr.ConfigPNG(cfg)
			if err != nil {
				httpapi.Error(w, http.StatusInternalServerError, "QR generation failed")
				return
			}
			w.Header().Set("Content-Type", "image/png")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(png)
		})
		sr.Post("/revoke", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "uuid")
			sum, err := svc.Revoke(req.Context(), id)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					httpapi.Error(w, http.StatusNotFound, "Not found")
					return
				}
				if strings.Contains(err.Error(), "wireguard") {
					httpapi.Error(w, http.StatusBadGateway, "WireGuard operation failed")
					return
				}
				httpapi.Error(w, http.StatusInternalServerError, "Internal error")
				return
			}
			httpapi.JSON(w, http.StatusOK, sum)
		})
		sr.Post("/rotate", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "uuid")
			sum, err := svc.Rotate(req.Context(), id)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					httpapi.Error(w, http.StatusNotFound, "Not found")
					return
				}
				if strings.Contains(err.Error(), "device inactive") {
					httpapi.Error(w, http.StatusBadRequest, "Device is inactive")
					return
				}
				if strings.Contains(err.Error(), "wireguard") {
					httpapi.Error(w, http.StatusBadGateway, "WireGuard operation failed")
					return
				}
				httpapi.Error(w, http.StatusInternalServerError, "Internal error")
				return
			}
			httpapi.JSON(w, http.StatusOK, sum)
		})
	})
	return r
}

func writeNotFound(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		httpapi.Error(w, http.StatusNotFound, "Not found")
		return
	}
	httpapi.Error(w, http.StatusInternalServerError, "Internal error")
}

func writeServiceErr(w http.ResponseWriter, err error) {
	var verr validator.ValidationErrors
	if errors.As(err, &verr) {
		httpapi.Error(w, http.StatusBadRequest, verr.Error())
		return
	}
	if strings.Contains(err.Error(), "wireguard") {
		httpapi.Error(w, http.StatusBadGateway, "WireGuard operation failed")
		return
	}
	httpapi.Error(w, http.StatusInternalServerError, "Internal error")
}
