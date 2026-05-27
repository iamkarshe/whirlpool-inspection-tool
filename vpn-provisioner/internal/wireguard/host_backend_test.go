package wireguard

import (
	"testing"
)

func TestParseWGAllowedIPs(t *testing.T) {
	in := "fHf+hQLANfAShwhM+ichZrwl/kesizaIMtbXxyh3gjM=\t10.44.0.20/32\n" +
		"JxSeTtsgGvXmWU81c4VCfrGjRS3RdEt/iyaoqZw71BU=\t(none)\n" +
		"1hSY1UlFyS7jpc0NCqAhu7EmJb/j7MidUZhojj5ytQw=\t10.44.0.11/32\n"

	got := parseWGAllowedIPs(in)
	if len(got) != 3 {
		t.Fatalf("expected 3 peers, got %d", len(got))
	}
	if got[0].PublicKey != "fHf+hQLANfAShwhM+ichZrwl/kesizaIMtbXxyh3gjM=" || got[0].AllowedIP != "10.44.0.20" {
		t.Fatalf("peer 0: %+v", got[0])
	}
	if got[1].AllowedIP != "" {
		t.Fatalf("peer 1 allowed_ip want empty, got %q", got[1].AllowedIP)
	}
	if got[2].AllowedIP != "10.44.0.11" {
		t.Fatalf("peer 2 allowed_ip want 10.44.0.11, got %q", got[2].AllowedIP)
	}
}
