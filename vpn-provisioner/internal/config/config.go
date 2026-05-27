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
	Addr      string
	DBPath    string
	AdminKey  string
	WGBackend string

	WGDockerContainer string
	WGInterface       string

	WGServerEndpoint string
	WGServerVPNIP    string

	WGClientDNS        string
	WGClientAllowedIPs string

	WGDeviceStartIP string
	WGDeviceEndIP   string
}

func LoadFromEnv() (Config, error) {
	// For local developer convenience (e.g. when running via Air), load .env if present.
	// This is a no-op if .env doesn't exist.
	_ = loadDotEnvIfPresent(".env")

	c := Config{
		Env:       getenv("APP_ENV", "local"),
		Addr:      getenv("APP_ADDR", ":8080"),
		DBPath:    getenv("APP_DB_PATH", "./data/vpn_provisioner.sqlite"),
		AdminKey:  os.Getenv("APP_ADMIN_API_KEY"),
		WGBackend: getenv("WG_BACKEND", "docker"),

		WGDockerContainer: getenv("WG_DOCKER_CONTAINER", "whirlpool-wireguard-mock"),
		WGInterface:       getenv("WG_INTERFACE", "wg0"),

		WGServerEndpoint: os.Getenv("WG_SERVER_ENDPOINT"),
		WGServerVPNIP:    getenv("WG_SERVER_VPN_IP", "10.44.0.1"),

		WGClientDNS:        getenv("WG_CLIENT_DNS", "10.44.0.1"),
		WGClientAllowedIPs: getenv("WG_CLIENT_ALLOWED_IPS", "10.20.0.0/16, 10.44.0.0/24"),

		WGDeviceStartIP: getenv("WG_DEVICE_START_IP", "10.44.0.11"),
		WGDeviceEndIP:   getenv("WG_DEVICE_END_IP", "10.44.0.200"),
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
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	return v
}

func validateIP(v string) error {
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
	ip := net.ParseIP(strings.TrimSpace(s)).To4()
	if ip == nil {
		return 0
	}
	return uint32(ip[0])<<24 | uint32(ip[1])<<16 | uint32(ip[2])<<8 | uint32(ip[3])
}

func Uint32ToIP(v uint32) string {
	b0 := byte(v >> 24)
	b1 := byte(v >> 16)
	b2 := byte(v >> 8)
	b3 := byte(v)
	return net.IPv4(b0, b1, b2, b3).String()
}

func ParsePortFromAddr(addr string) (int, error) {
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
