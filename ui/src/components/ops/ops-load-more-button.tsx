import { Button } from "@/components/ui/button";

export function OpsLoadMoreButton({
  hasMore,
  loading,
  onClick,
}: {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  if (!hasMore) return null;
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={onClick}
    >
      {loading ? "Loading…" : "Load more"}
    </Button>
  );
}
