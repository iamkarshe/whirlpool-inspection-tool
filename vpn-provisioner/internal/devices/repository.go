package devices

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/config"
)

var ErrNotFound = errors.New("device not found")

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) listAssignedIPsTx(ctx context.Context, tx *sql.Tx) (map[string]struct{}, error) {
	rows, err := tx.QueryContext(ctx, `SELECT assigned_ip FROM vpn_devices`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	out := make(map[string]struct{})
	for rows.Next() {
		var ip string
		if err := rows.Scan(&ip); err != nil {
			return nil, err
		}
		out[ip] = struct{}{}
	}
	return out, rows.Err()
}

func nextAvailableIP(cfg config.Config, used map[string]struct{}) (string, error) {
	start := config.IpToUint32(cfg.WGDeviceStartIP)
	end := config.IpToUint32(cfg.WGDeviceEndIP)
	if start == 0 || end == 0 {
		return "", fmt.Errorf("invalid IP range")
	}
	for v := start; v <= end; v++ {
		ip := config.Uint32ToIP(v)
		if _, ok := used[ip]; !ok {
			return ip, nil
		}
	}
	return "", fmt.Errorf("no free IP in range %s-%s", cfg.WGDeviceStartIP, cfg.WGDeviceEndIP)
}

func (r *Repository) Create(ctx context.Context, cfg config.Config, d *Device) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	used, err := r.listAssignedIPsTx(ctx, tx)
	if err != nil {
		return err
	}
	ip, err := nextAvailableIP(cfg, used)
	if err != nil {
		return err
	}
	d.AssignedIP = ip
	if d.UUID == "" {
		d.UUID = uuid.NewString()
	}
	now := time.Now().UTC()
	d.CreatedAt = now
	d.UpdatedAt = now
	d.IsActive = true

	isActive := 1
	_, err = tx.ExecContext(ctx, `
		INSERT INTO vpn_devices (
			uuid, user_name, user_email, device_name, device_type,
			assigned_ip, public_key, private_key_encrypted, is_active,
			created_at, updated_at, revoked_at, last_config_downloaded_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
	`,
		d.UUID, d.UserName, d.UserEmail, d.DeviceName, nullStr(d.DeviceType),
		d.AssignedIP, d.PublicKey, d.PrivateKeyEncrypted, isActive,
		d.CreatedAt.Format(time.RFC3339), d.UpdatedAt.Format(time.RFC3339),
	)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) DeleteByUUID(ctx context.Context, deviceUUID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM vpn_devices WHERE uuid = ?`, deviceUUID)
	return err
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func (r *Repository) GetByUUID(ctx context.Context, id string) (*Device, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, uuid, user_name, user_email, device_name, device_type,
			assigned_ip, public_key, private_key_encrypted, is_active,
			created_at, updated_at, revoked_at, last_config_downloaded_at
		FROM vpn_devices WHERE uuid = ?
	`, id)
	return scanDevice(row)
}

func scanDevice(row *sql.Row) (*Device, error) {
	var d Device
	var deviceType, priv, revokedAt, lastDL sql.NullString
	var isActive int
	var createdAt, updatedAt string
	err := row.Scan(
		&d.ID, &d.UUID, &d.UserName, &d.UserEmail, &d.DeviceName, &deviceType,
		&d.AssignedIP, &d.PublicKey, &priv, &isActive,
		&createdAt, &updatedAt, &revokedAt, &lastDL,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if deviceType.Valid {
		d.DeviceType = deviceType.String
	}
	if priv.Valid {
		d.PrivateKeyEncrypted = priv.String
	}
	d.IsActive = isActive != 0
	d.CreatedAt = mustParseTime(createdAt)
	d.UpdatedAt = mustParseTime(updatedAt)
	if revokedAt.Valid {
		t := mustParseTime(revokedAt.String)
		d.RevokedAt = &t
	}
	if lastDL.Valid {
		t := mustParseTime(lastDL.String)
		d.LastConfigDownloadedAt = &t
	}
	return &d, nil
}

func mustParseTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t, _ = time.Parse("2006-01-02 15:04:05", s)
	}
	return t.UTC()
}

func (r *Repository) List(ctx context.Context) ([]Device, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, uuid, user_name, user_email, device_name, device_type,
			assigned_ip, public_key, private_key_encrypted, is_active,
			created_at, updated_at, revoked_at, last_config_downloaded_at
		FROM vpn_devices ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var list []Device
	for rows.Next() {
		var d Device
		var deviceType, priv, revokedAt, lastDL sql.NullString
		var isActive int
		var createdAt, updatedAt string
		if err := rows.Scan(
			&d.ID, &d.UUID, &d.UserName, &d.UserEmail, &d.DeviceName, &deviceType,
			&d.AssignedIP, &d.PublicKey, &priv, &isActive,
			&createdAt, &updatedAt, &revokedAt, &lastDL,
		); err != nil {
			return nil, err
		}
		if deviceType.Valid {
			d.DeviceType = deviceType.String
		}
		if priv.Valid {
			d.PrivateKeyEncrypted = priv.String
		}
		d.IsActive = isActive != 0
		d.CreatedAt = mustParseTime(createdAt)
		d.UpdatedAt = mustParseTime(updatedAt)
		if revokedAt.Valid {
			t := mustParseTime(revokedAt.String)
			d.RevokedAt = &t
		}
		if lastDL.Valid {
			t := mustParseTime(lastDL.String)
			d.LastConfigDownloadedAt = &t
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

func (r *Repository) Revoke(ctx context.Context, deviceUUID string, revokedAt time.Time) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE vpn_devices
		SET is_active = 0, revoked_at = ?, updated_at = ?
		WHERE uuid = ? AND is_active = 1
	`, revokedAt.Format(time.RFC3339), revokedAt.Format(time.RFC3339), deviceUUID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) UpdateKeys(ctx context.Context, deviceUUID, pub, priv string, updatedAt time.Time) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE vpn_devices
		SET public_key = ?, private_key_encrypted = ?, updated_at = ?
		WHERE uuid = ? AND is_active = 1
	`, pub, priv, updatedAt.Format(time.RFC3339), deviceUUID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) TouchLastConfigDownloaded(ctx context.Context, deviceUUID string, t time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vpn_devices SET last_config_downloaded_at = ?, updated_at = ?
		WHERE uuid = ?
	`, t.Format(time.RFC3339), t.Format(time.RFC3339), deviceUUID)
	return err
}
