package audit

import "time"

// LogRow is a persisted audit log entry.
type LogRow struct {
	ID         int64
	UUID       string
	Action     string
	Actor      string
	DeviceUUID string
	Metadata   string
	CreatedAt  time.Time
}
