package httpapi

import (
	"encoding/json"
	"net/http"
	"runtime/debug"
)

var debugMode bool

// SetDebug toggles verbose error responses (cause + stack) on API errors.
func SetDebug(on bool) { debugMode = on }

type DebugInfo struct {
	Cause string `json:"cause,omitempty"`
	Stack string `json:"stack,omitempty"`
}

type Envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Debug   *DebugInfo  `json:"debug,omitempty"`
}

func JSON(w http.ResponseWriter, status int, data interface{}) {
	// JSON writes the standard success envelope.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Envelope{Success: true, Data: data})
}

func Error(w http.ResponseWriter, status int, msg string) {
	writeError(w, status, msg, nil)
}

// ErrorCause writes an error envelope; includes cause+stack when APP_DEBUG is on.
func ErrorCause(w http.ResponseWriter, status int, msg string, err error) {
	writeError(w, status, msg, err)
}

func writeError(w http.ResponseWriter, status int, msg string, err error) {
	env := Envelope{Success: false, Error: msg}
	if debugMode {
		cause := msg
		if err != nil {
			cause = err.Error()
		}
		env.Debug = &DebugInfo{
			Cause: cause,
			Stack: string(debug.Stack()),
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(env)
}
