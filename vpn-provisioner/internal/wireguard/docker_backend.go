package wireguard

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

// DockerBackend runs wg commands inside the WireGuard mock container via docker exec.
// Use only in development; production should use HostBackend with restricted scripts.
type DockerBackend struct {
	container string
	iface     string
}

func NewDockerBackend(container, iface string) *DockerBackend {
	return &DockerBackend{
		container: strings.TrimSpace(container),
		iface:     strings.TrimSpace(iface),
	}
}

func (d *DockerBackend) AddPeer(publicKey string, allowedIP string) error {
	cidr := strings.TrimSpace(allowedIP)
	if !strings.Contains(cidr, "/") {
		cidr = cidr + "/32"
	}
	cmd := exec.Command("docker", "exec", d.container, "wg", "set", d.iface, "peer", strings.TrimSpace(publicKey), "allowed-ips", cidr)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("docker wg set peer: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func (d *DockerBackend) RemovePeer(publicKey string) error {
	cmd := exec.Command("docker", "exec", d.container, "wg", "set", d.iface, "peer", strings.TrimSpace(publicKey), "remove")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("docker wg remove peer: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

// ShowPeers parses `wg show <iface> dump` (tab-separated).
func (d *DockerBackend) ShowPeers() ([]Peer, error) {
	cmd := exec.Command("docker", "exec", d.container, "wg", "show", d.iface, "dump")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("docker wg show dump: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return parseWGShowDump(stdout.String())
}

func (d *DockerBackend) ServerPublicKey() (string, error) {
	cmd := exec.Command("docker", "exec", d.container, "cat", "/etc/wireguard/server_public.key")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("docker cat server_public.key: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
}

func parseWGShowDump(out string) ([]Peer, error) {
	lines := strings.Split(strings.TrimSpace(out), "\n")
	var peers []Peer
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := strings.Split(line, "\t")
		if i == 0 && len(fields) >= 4 {
			// interface line: private_key, public_key, listen_port, fwmark
			continue
		}
		// peer line: public_key, preshared_key, endpoint, allowed_ips, ...
		if len(fields) < 4 {
			continue
		}
		pub := strings.TrimSpace(fields[0])
		allowedField := strings.TrimSpace(fields[3])
		if pub == "" {
			continue
		}
		// allowed_ips may be comma-separated CIDRs; expose first as allowed_ip
		allowedIP := firstAllowedIP(allowedField)
		peers = append(peers, Peer{PublicKey: pub, AllowedIP: allowedIP})
	}
	return peers, nil
}

func firstAllowedIP(allowedField string) string {
	parts := strings.Split(allowedField, ",")
	if len(parts) == 0 {
		return allowedField
	}
	return strings.TrimSpace(parts[0])
}
