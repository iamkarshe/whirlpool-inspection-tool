package config

import (
	"bufio"
	"os"
	"strings"
)

func loadDotEnvIfPresent(path string) error {
	// Minimal .env parser (supports spaces after '=').
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer func() { _ = f.Close() }()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// allow "export KEY=VALUE"
		line = strings.TrimSpace(strings.TrimPrefix(line, "export "))

		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		if k == "" {
			continue
		}

		// Respect already-set env vars (shell/CI overrides .env)
		if _, exists := os.LookupEnv(k); exists {
			continue
		}

		v = strings.TrimSpace(v)
		// Strip simple surrounding quotes
		if len(v) >= 2 {
			if (v[0] == '"' && v[len(v)-1] == '"') || (v[0] == '\'' && v[len(v)-1] == '\'') {
				v = v[1 : len(v)-1]
			}
		}
		_ = os.Setenv(k, v)
	}
	return sc.Err()
}
