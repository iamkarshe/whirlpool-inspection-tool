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
	cmd := exec.Command(hostScriptAddPeer, strings.TrimSpace(publicKey), ip)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s: %w: %s", hostScriptAddPeer, err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func (h *HostBackend) RemovePeer(publicKey string) error {
	cmd := exec.Command(hostScriptRemovePeer, strings.TrimSpace(publicKey))
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s: %w: %s", hostScriptRemovePeer, err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func (h *HostBackend) ShowPeers() ([]Peer, error) {
	cmd := exec.Command(hostScriptShowPeers)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("%s: %w: %s", hostScriptShowPeers, err, strings.TrimSpace(stderr.String()))
	}
	// Expect same dump format as `wg show <iface> dump` or parse as needed on host.
	return parseWGShowDump(stdout.String())
}

func (h *HostBackend) ServerPublicKey() (string, error) {
	cmd := exec.Command(hostScriptServerPub)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%s: %w: %s", hostScriptServerPub, err, strings.TrimSpace(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
}
