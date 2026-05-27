package httpapi

import (
	"net/http"
	"strings"
)

func AdminAPIKeyAuth(adminKey string) func(http.Handler) http.Handler {
	// AdminAPIKeyAuth enforces Authorization: Bearer <key>.
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := strings.TrimSpace(r.Header.Get("Authorization"))
			const prefix = "Bearer "
			if !strings.HasPrefix(auth, prefix) {
				Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			token := strings.TrimSpace(strings.TrimPrefix(auth, prefix))
			if token == "" || token != adminKey {
				Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
