package audit

import "context"

// Service records audit events (MVP: best-effort; callers log failures).
type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Record(ctx context.Context, action, actor, deviceUUID, metadata string) error {
	if s == nil || s.repo == nil {
		return nil
	}
	return s.repo.Insert(ctx, action, actor, deviceUUID, metadata)
}
