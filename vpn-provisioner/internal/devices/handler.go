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
			httpapi.ErrorCause(w, http.StatusInternalServerError, "Internal error", err)
			return
		}
		httpapi.JSON(w, http.StatusOK, list)
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var in CreateDeviceInput
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			httpapi.ErrorCause(w, http.StatusBadRequest, "Invalid JSON", err)
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
				writeClientConfigErr(w, err)
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
				writeClientConfigErr(w, err)
				return
			}
			png, err := qr.ConfigPNG(cfg)
			if err != nil {
				httpapi.ErrorCause(w, http.StatusInternalServerError, "QR generation failed", err)
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
				writeRevokeErr(w, err)
				return
			}
			httpapi.JSON(w, http.StatusOK, sum)
		})
		sr.Post("/rotate", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "uuid")
			sum, err := svc.Rotate(req.Context(), id)
			if err != nil {
				writeRotateErr(w, err)
				return
			}
			httpapi.JSON(w, http.StatusOK, sum)
		})
	})
	return r
}

func writeNotFound(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		httpapi.ErrorCause(w, http.StatusNotFound, "Not found", err)
		return
	}
	httpapi.ErrorCause(w, http.StatusInternalServerError, "Internal error", err)
}

func writeServiceErr(w http.ResponseWriter, err error) {
	var verr validator.ValidationErrors
	if errors.As(err, &verr) {
		httpapi.ErrorCause(w, http.StatusBadRequest, verr.Error(), err)
		return
	}
	if strings.Contains(err.Error(), "wireguard") {
		httpapi.ErrorCause(w, http.StatusBadGateway, "WireGuard operation failed", err)
		return
	}
	httpapi.ErrorCause(w, http.StatusInternalServerError, "Internal error", err)
}

func writeClientConfigErr(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		httpapi.ErrorCause(w, http.StatusNotFound, "Not found", err)
		return
	}
	if strings.Contains(err.Error(), "device inactive") {
		httpapi.ErrorCause(w, http.StatusBadRequest, "Device is inactive", err)
		return
	}
	httpapi.ErrorCause(w, http.StatusInternalServerError, "Internal error", err)
}

func writeRevokeErr(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		httpapi.ErrorCause(w, http.StatusNotFound, "Not found", err)
		return
	}
	if strings.Contains(err.Error(), "wireguard") {
		httpapi.ErrorCause(w, http.StatusBadGateway, "WireGuard operation failed", err)
		return
	}
	httpapi.ErrorCause(w, http.StatusInternalServerError, "Internal error", err)
}

func writeRotateErr(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		httpapi.ErrorCause(w, http.StatusNotFound, "Not found", err)
		return
	}
	if strings.Contains(err.Error(), "device inactive") {
		httpapi.ErrorCause(w, http.StatusBadRequest, "Device is inactive", err)
		return
	}
	if strings.Contains(err.Error(), "wireguard") {
		httpapi.ErrorCause(w, http.StatusBadGateway, "WireGuard operation failed", err)
		return
	}
	httpapi.ErrorCause(w, http.StatusInternalServerError, "Internal error", err)
}
