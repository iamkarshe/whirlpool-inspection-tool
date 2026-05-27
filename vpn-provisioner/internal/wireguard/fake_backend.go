package wireguard

import (
	"fmt"
	"strings"
	"sync"
)

// FakeBackend is an in-memory Backend for unit tests (no Docker or host commands).
type FakeBackend struct {
	mu           sync.Mutex
	peers        map[string]string // publicKey -> allowedIP (host part, no /32 required internally)
	serverPubKey string
}

func NewFakeBackend(serverPublicKey string) *FakeBackend {
	if strings.TrimSpace(serverPublicKey) == "" {
		serverPublicKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
	}
	return &FakeBackend{
		peers:        make(map[string]string),
		serverPubKey: strings.TrimSpace(serverPublicKey),
	}
}

func (f *FakeBackend) AddPeer(publicKey string, allowedIP string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	pk := strings.TrimSpace(publicKey)
	if pk == "" {
		return fmt.Errorf("empty public key")
	}
	f.peers[pk] = strings.TrimSpace(allowedIP)
	return nil
}

func (f *FakeBackend) RemovePeer(publicKey string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.peers, strings.TrimSpace(publicKey))
	return nil
}

func (f *FakeBackend) ShowPeers() ([]Peer, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]Peer, 0, len(f.peers))
	for pk, ip := range f.peers {
		out = append(out, Peer{PublicKey: pk, AllowedIP: ip})
	}
	return out, nil
}

func (f *FakeBackend) ServerPublicKey() (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.serverPubKey, nil
}
