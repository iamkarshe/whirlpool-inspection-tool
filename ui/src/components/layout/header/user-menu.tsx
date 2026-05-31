import {
  Activity,
  BadgeCheck,
  Bell,
  FileText,
  Info,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import { useSessionUser } from "@/hooks/use-session-user";
import { clearAuthenticatedSession } from "@/services/login-service";
import {
  getApiDocumentationUrl,
  getVaptReportUrl,
} from "@/lib/api-documentation-url";
import { getAvatarImage } from "@/lib/utils";

export default function UserMenu() {
  const navigate = useNavigate();
  const sessionUser = useSessionUser();
  const displayName = sessionUser?.name || "User";
  const displayEmail = sessionUser?.email || "user@whirlpool.com";
  const apiDocUrl = getApiDocumentationUrl();
  const vaptReportUrl = getVaptReportUrl();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar>
          <AvatarImage src={getAvatarImage()} alt="" />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
        align="end"
      >
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{displayName}</span>
              <span className="text-muted-foreground truncate text-xs">
                {displayEmail}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              navigate(PAGES.DASHBOARD_SETTINGS);
            }}
          >
            <BadgeCheck />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Activity />
            Activity Log
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Bell />
            Notifications
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!apiDocUrl}
            onSelect={(event) => {
              event.preventDefault();
              if (!apiDocUrl) return;
              window.open(apiDocUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <FileText />
            API Documentation
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!vaptReportUrl}
            onSelect={(event) => {
              event.preventDefault();
              if (!vaptReportUrl) return;
              window.open(vaptReportUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <ShieldCheck />
            VAPT Report
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              navigate(PAGES.DASHBOARD_RELEASE_NOTES);
            }}
          >
            <Info />
            Release Notes
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to log out? You will be returned to the
                login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  clearAuthenticatedSession();
                  navigate(PAGES.LOGIN, { replace: true });
                }}
              >
                Log out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
