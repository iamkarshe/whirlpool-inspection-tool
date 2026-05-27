package devices

import "time"

// Device is a provisioned VPN device row.
//
// TODO: Encrypt private_key_encrypted at rest before production; currently stored as plain key material for local MVP.
type Device struct {
	ID                     int64
	UUID                   string
	UserName               string
	UserEmail              string
	DeviceName             string
	DeviceType             string
	AssignedIP             string
	PublicKey              string
	PrivateKeyEncrypted    string
	IsActive               bool
	CreatedAt              time.Time
	UpdatedAt              time.Time
	RevokedAt              *time.Time
	LastConfigDownloadedAt *time.Time
}

// Summary is returned from JSON APIs (no private key).
type Summary struct {
	UUID       string `json:"uuid"`
	UserName   string `json:"user_name"`
	UserEmail  string `json:"user_email"`
	DeviceName string `json:"device_name"`
	DeviceType string `json:"device_type,omitempty"`
	AssignedIP string `json:"assigned_ip"`
	IsActive   bool   `json:"is_active"`
}

func (d *Device) Summary() Summary {
	if d == nil {
		return Summary{}
	}
	return Summary{
		UUID:       d.UUID,
		UserName:   d.UserName,
		UserEmail:  d.UserEmail,
		DeviceName: d.DeviceName,
		DeviceType: d.DeviceType,
		AssignedIP: d.AssignedIP,
		IsActive:   d.IsActive,
	}
}

// CreateDeviceInput is the JSON body for POST /v1/devices.
type CreateDeviceInput struct {
	UserName   string `json:"user_name" validate:"required"`
	UserEmail  string `json:"user_email" validate:"required,email"`
	DeviceName string `json:"device_name" validate:"required"`
	DeviceType string `json:"device_type"`
}
