package audit

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Insert(ctx context.Context, action, actor, deviceUUID, metadata string) error {
	id := uuid.NewString()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO audit_logs (uuid, action, actor, device_uuid, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		id, action, nullIfEmpty(actor), nullIfEmpty(deviceUUID), nullIfEmpty(metadata), now,
	)
	return err
}

func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
