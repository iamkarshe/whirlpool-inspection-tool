package wireguard

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

const (
	hostScriptAddPeer    = "/usr/local/bin/vpn-add-peer"
	hostScriptRemovePeer = "/usr/local/bin/vpn-remove-peer"
	hostScriptShowPeers  = "/usr/local/bin/vpn-show-peers"
	hostScriptServerPub  = "/usr/local/bin/vpn-server-public-key"
)

// HostBackend calls fixed wrapper scripts only (production). No arbitrary shell.
type HostBackend struct{}

func NewHostBackend(_ string) *HostBackend {
	return &HostBackend{}
}

func (h *HostBackend) AddPeer(publicKey string, allowedIP string) error {
	ip := strings.TrimSpace(allowedIP)
	cmd := exec.Command("sudo", hostScriptAddPeer, strings.TrimSpace(publicKey), ip)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s: %w: %s", hostScriptAddPeer, err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func (h *HostBackend) RemovePeer(publicKey string) error {
	cmd := exec.Command("sudo", hostScriptRemovePeer, strings.TrimSpace(publicKey))
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s: %w: %s", hostScriptRemovePeer, err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func (h *HostBackend) ShowPeers() ([]Peer, error) {
	cmd := exec.Command("sudo", hostScriptShowPeers)

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("%s: %w: %s", hostScriptShowPeers, err, strings.TrimSpace(stderr.String()))
	}

	return parseWGAllowedIPs(stdout.String()), nil
}

// parseWGAllowedIPs parses vpn-show-peers output: "<pubkey>\t<allowed-ip>/32" per line.
func parseWGAllowedIPs(output string) []Peer {
	peers := make([]Peer, 0)

	output = strings.TrimSpace(output)
	if output == "" {
		return peers
	}

	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}

		publicKey := fields[0]
		allowedIP := fields[1]

		if allowedIP == "(none)" {
			allowedIP = ""
		} else {
			allowedIP = strings.TrimSuffix(allowedIP, "/32")
		}

		peers = append(peers, Peer{
			PublicKey: publicKey,
			AllowedIP: allowedIP,
		})
	}

	return peers
}

func (h *HostBackend) ServerPublicKey() (string, error) {
	cmd := exec.Command("sudo", hostScriptServerPub)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%s: %w: %s", hostScriptServerPub, err, strings.TrimSpace(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
}
