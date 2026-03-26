import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import { ClipboardList, Package } from "lucide-react";
import { Link } from "react-router-dom";

const linkBadgeClass = `${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`;

export function ProductCategoryProductsCountBadge({
  categoryId,
  count,
}: {
  categoryId: number;
  count: number;
}) {
  return (
    <Link
      to={`${PAGES.productCategoryViewPath(categoryId)}/products`}
      className="inline-block"
    >
      <Badge variant="secondary" className={linkBadgeClass}>
        <Package />
        {count}
      </Badge>
    </Link>
  );
}

export function ProductCategoryChecklistsCountBadge({
  categoryId,
  count,
}: {
  categoryId: number;
  count: number;
}) {
  return (
    <Link
      to={PAGES.productCategoryChecklistsPath(categoryId)}
      className="inline-block"
    >
      <Badge variant="secondary" className={linkBadgeClass}>
        <ClipboardList />
        {count}
      </Badge>
    </Link>
  );
}

