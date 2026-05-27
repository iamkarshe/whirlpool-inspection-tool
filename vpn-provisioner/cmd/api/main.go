package main

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"

	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/audit"
	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/config"
	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/database"
	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/devices"
	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/httpapi"
	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/wireguard"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg, err := config.LoadFromEnv()
	if err != nil {
		slog.Error("config load failed", "error", err)
		os.Exit(1)
	}

	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0o755); err != nil {
		slog.Error("create db directory failed", "error", err)
		os.Exit(1)
	}

	db, err := database.Open(cfg.DBPath)
	if err != nil {
		slog.Error("db open failed", "error", err)
		os.Exit(1)
	}
	defer func() { _ = db.Close() }()

	if err := database.RunMigrations(db.SQL, "./migrations"); err != nil {
		slog.Error("migrations failed", "error", err)
		os.Exit(1)
	}

	wgBackend, err := wireguard.NewFromConfig(cfg)
	if err != nil {
		slog.Error("wireguard backend init failed", "error", err)
		os.Exit(1)
	}

	auditRepo := audit.NewRepository(db.SQL)
	auditSvc := audit.NewService(auditRepo)
	devRepo := devices.NewRepository(db.SQL)
	devSvc := devices.NewService(cfg, devRepo, wgBackend, auditSvc)

	router := httpapi.NewRouter(httpapi.RouterDeps{
		AdminAPIKey: cfg.AdminKey,
		Handlers: httpapi.Handlers{
			Health: func(w http.ResponseWriter, r *http.Request) {
				httpapi.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
			},
			Devices:        devices.NewHandler(devSvc),
			WireGuardPeers: httpapi.WireGuardPeers(wgBackend),
		},
	})

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	slog.Info("api starting", "addr", cfg.Addr, "env", cfg.Env)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}
