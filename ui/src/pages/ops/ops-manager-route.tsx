import { APP_ROLE } from "@/lib/app-roles";
import { PageGuard } from "@/router/page-guard";

/** Restricts child routes to warehouse managers (not operators). */
export default function OpsManagerRoute() {
  return <PageGuard allowedRoles={[APP_ROLE.manager]} />;
}
