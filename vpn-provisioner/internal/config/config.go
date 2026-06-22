package config

import (
	"errors"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Env       string
	Debug     bool
	Addr      string
	DBPath    string
	AdminKey  string
	WGBackend string

	WGDockerContainer string
	WGInterface       string

	WGServerEndpoint string
	WGServerVPNIP    string

	WGClientDNS        string
	WGClientMTU        int
	WGClientAllowedIPs string

	WGDeviceStartIP string
	WGDeviceEndIP   string
}

func LoadFromEnv() (Config, error) {
	// Load .env for local runs (Air), without overriding real env vars.
	_ = loadDotEnvIfPresent(".env")

	c := Config{
		Env:       getenv("APP_ENV", "local"),
		Debug:     parseBoolEnv("APP_DEBUG", false),
		Addr:      getenv("APP_ADDR", ":8080"),
		DBPath:    getenv("APP_DB_PATH", "./data/vpn_provisioner.sqlite"),
		AdminKey:  os.Getenv("APP_ADMIN_API_KEY"),
		WGBackend: getenv("WG_BACKEND", "docker"),

		WGDockerContainer: getenv("WG_DOCKER_CONTAINER", "whirlpool-wireguard-mock"),
		WGInterface:       getenv("WG_INTERFACE", "wg0"),

		WGServerEndpoint: os.Getenv("WG_SERVER_ENDPOINT"),
		WGServerVPNIP:    getenv("WG_SERVER_VPN_IP", "10.44.0.1"),

		WGClientDNS:        getenv("WG_CLIENT_DNS", "10.44.0.1"),
		WGClientAllowedIPs: getenv("WG_CLIENT_ALLOWED_IPS", "10.20.0.0/16, 10.44.0.0/22"),

		WGDeviceStartIP: getenv("WG_DEVICE_START_IP", "10.44.0.11"),
		WGDeviceEndIP:   getenv("WG_DEVICE_END_IP", "10.44.3.254"),
	}

	if c.AdminKey == "" {
		return Config{}, errors.New("APP_ADMIN_API_KEY is required")
	}
	if c.WGServerEndpoint == "" {
		return Config{}, errors.New("WG_SERVER_ENDPOINT is required")
	}
	if err := validateIP(c.WGServerVPNIP); err != nil {
		return Config{}, fmt.Errorf("WG_SERVER_VPN_IP invalid: %w", err)
	}
	if err := validateIP(c.WGClientDNS); err != nil {
		return Config{}, fmt.Errorf("WG_CLIENT_DNS invalid: %w", err)
	}
	mtu, err := parseIntEnv("WG_CLIENT_MTU", 1380)
	if err != nil {
		return Config{}, fmt.Errorf("WG_CLIENT_MTU invalid: %w", err)
	}
	if mtu < 68 || mtu > 65535 {
		return Config{}, errors.New("WG_CLIENT_MTU must be between 68 and 65535")
	}
	c.WGClientMTU = mtu
	if err := validateIP(c.WGDeviceStartIP); err != nil {
		return Config{}, fmt.Errorf("WG_DEVICE_START_IP invalid: %w", err)
	}
	if err := validateIP(c.WGDeviceEndIP); err != nil {
		return Config{}, fmt.Errorf("WG_DEVICE_END_IP invalid: %w", err)
	}
	if ipToUint32(c.WGDeviceStartIP) > ipToUint32(c.WGDeviceEndIP) {
		return Config{}, errors.New("WG_DEVICE_START_IP must be <= WG_DEVICE_END_IP")
	}

	return c, nil
}

func getenv(key, def string) string {
	// getenv returns def when env var is unset/blank.
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	return v
}

func parseIntEnv(key string, def int) (int, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, err
	}
	return n, nil
}

func parseBoolEnv(key string, def bool) bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if v == "" {
		return def
	}
	switch v {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return def
	}
}

func validateIP(v string) error {
	// validateIP enforces IPv4 strings.
	ip := net.ParseIP(strings.TrimSpace(v))
	if ip == nil {
		return errors.New("not an ip")
	}
	ip4 := ip.To4()
	if ip4 == nil {
		return errors.New("not an ipv4 address")
	}
	return nil
}

func ipToUint32(s string) uint32 {
	// ipToUint32 maps IPv4 dotted-quad to uint32 for range iteration.
	ip := net.ParseIP(strings.TrimSpace(s)).To4()
	if ip == nil {
		return 0
	}
	return uint32(ip[0])<<24 | uint32(ip[1])<<16 | uint32(ip[2])<<8 | uint32(ip[3])
}

// IpToUint32 converts an IPv4 string to a uint32 (host order for range iteration).
func IpToUint32(s string) uint32 { return ipToUint32(s) }

func Uint32ToIP(v uint32) string {
	// Uint32ToIP maps a uint32 back to an IPv4 dotted-quad string.
	b0 := byte(v >> 24)
	b1 := byte(v >> 16)
	b2 := byte(v >> 8)
	b3 := byte(v)
	return net.IPv4(b0, b1, b2, b3).String()
}

func ParsePortFromAddr(addr string) (int, error) {
	// ParsePortFromAddr extracts the port from common listen addr formats.
	// Supports ":8080" and "0.0.0.0:8080"
	_, portStr, err := net.SplitHostPort(addr)
	if err != nil {
		if strings.HasPrefix(addr, ":") {
			portStr = strings.TrimPrefix(addr, ":")
		} else {
			return 0, err
		}
	}
	p, err := strconv.Atoi(portStr)
	if err != nil {
		return 0, err
	}
	return p, nil
}
