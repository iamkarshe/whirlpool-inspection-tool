package devices

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-playground/validator/v10"

	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/audit"
	"github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/config"
	wgp "github.com/scoptanalytics/whirlpool-vpn-provisioner/internal/wireguard"
)

// Service coordinates DB, WireGuard backend, and audit logging.
type Service struct {
	cfg   config.Config
	repo  *Repository
	wg    wgp.Backend
	audit *audit.Service
	v     *validator.Validate
}

func NewService(cfg config.Config, repo *Repository, wg wgp.Backend, aud *audit.Service) *Service {
	return &Service{
		cfg:   cfg,
		repo:  repo,
		wg:    wg,
		audit: aud,
		v:     validator.New(),
	}
}

func (s *Service) Create(ctx context.Context, in CreateDeviceInput) (Summary, error) {
	// Create provisions keys, allocates IP, adds peer, then persists state.
	if err := s.v.Struct(in); err != nil {
		return Summary{}, err
	}
	kp, err := wgp.GenerateKeyPair()
	if err != nil {
		return Summary{}, err
	}
	d := &Device{
		UserName:            in.UserName,
		UserEmail:           in.UserEmail,
		DeviceName:          in.DeviceName,
		DeviceType:          in.DeviceType,
		PublicKey:           kp.PublicKey,
		PrivateKeyEncrypted: kp.PrivateKey, // TODO: encrypt at rest before production
	}
	if err := s.repo.Create(ctx, s.cfg, d); err != nil {
		return Summary{}, err
	}
	if err := s.wg.AddPeer(d.PublicKey, d.AssignedIP); err != nil {
		_ = s.repo.DeleteByUUID(ctx, d.UUID)
		return Summary{}, fmt.Errorf("wireguard add peer: %w", err)
	}
	_ = s.audit.Record(ctx, "device.create", "admin", d.UUID, "")
	return d.Summary(), nil
}

func (s *Service) List(ctx context.Context) ([]Summary, error) {
	all, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]Summary, 0, len(all))
	for i := range all {
		out = append(out, all[i].Summary())
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, uuid string) (Summary, error) {
	d, err := s.repo.GetByUUID(ctx, uuid)
	if err != nil {
		return Summary{}, err
	}
	return d.Summary(), nil
}

func (s *Service) ClientConfig(ctx context.Context, uuid string) (string, error) {
	d, err := s.repo.GetByUUID(ctx, uuid)
	if err != nil {
		return "", err
	}
	if !d.IsActive {
		return "", fmt.Errorf("device inactive")
	}
	srvPub, err := s.wg.ServerPublicKey()
	if err != nil {
		return "", err
	}
	cfgText := wgp.RenderClientConfig(wgp.ClientConfigParams{
		DevicePrivateKey:    d.PrivateKeyEncrypted,
		DeviceIP:            d.AssignedIP,
		ClientDNS:           s.cfg.WGClientDNS,
		ServerPublicKey:     srvPub,
		ServerEndpoint:      s.cfg.WGServerEndpoint,
		ClientAllowedIPsCSV: s.cfg.WGClientAllowedIPs,
	})
	now := time.Now().UTC()
	_ = s.repo.TouchLastConfigDownloaded(ctx, d.UUID, now)
	_ = s.audit.Record(ctx, "device.config_download", "admin", d.UUID, "")
	return cfgText, nil
}

func (s *Service) Revoke(ctx context.Context, uuid string) (Summary, error) {
	// Revoke removes the peer and marks the device inactive (keeps the record).
	d, err := s.repo.GetByUUID(ctx, uuid)
	if err != nil {
		return Summary{}, err
	}
	if !d.IsActive {
		return d.Summary(), nil
	}
	if err := s.wg.RemovePeer(d.PublicKey); err != nil {
		return Summary{}, fmt.Errorf("wireguard remove peer: %w", err)
	}
	revokedAt := time.Now().UTC()
	if err := s.repo.Revoke(ctx, d.UUID, revokedAt); err != nil && !errors.Is(err, ErrNotFound) {
		return Summary{}, err
	}
	d2, err := s.repo.GetByUUID(ctx, uuid)
	if err != nil {
		return Summary{}, err
	}
	_ = s.audit.Record(ctx, "device.revoke", "admin", d.UUID, "")
	return d2.Summary(), nil
}

func (s *Service) Rotate(ctx context.Context, uuid string) (Summary, error) {
	// Rotate swaps keys while keeping the assigned IP stable.
	d, err := s.repo.GetByUUID(ctx, uuid)
	if err != nil {
		return Summary{}, err
	}
	if !d.IsActive {
		return Summary{}, fmt.Errorf("device inactive")
	}
	oldPub := d.PublicKey
	oldIP := d.AssignedIP
	if err := s.wg.RemovePeer(oldPub); err != nil {
		return Summary{}, fmt.Errorf("wireguard remove peer: %w", err)
	}
	kp, err := wgp.GenerateKeyPair()
	if err != nil {
		_ = s.wg.AddPeer(oldPub, oldIP)
		return Summary{}, err
	}
	if err := s.wg.AddPeer(kp.PublicKey, oldIP); err != nil {
		_ = s.wg.AddPeer(oldPub, oldIP)
		return Summary{}, fmt.Errorf("wireguard add peer: %w", err)
	}
	now := time.Now().UTC()
	if err := s.repo.UpdateKeys(ctx, uuid, kp.PublicKey, kp.PrivateKey, now); err != nil {
		_ = s.wg.RemovePeer(kp.PublicKey)
		_ = s.wg.AddPeer(oldPub, oldIP)
		return Summary{}, err
	}
	d2, err := s.repo.GetByUUID(ctx, uuid)
	if err != nil {
		return Summary{}, err
	}
	_ = s.audit.Record(ctx, "device.rotate", "admin", d.UUID, "")
	return d2.Summary(), nil
}

func (s *Service) RawDevice(ctx context.Context, uuid string) (*Device, error) {
	return s.repo.GetByUUID(ctx, uuid)
}
