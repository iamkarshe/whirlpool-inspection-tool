import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DialogRequestLocationMode =
  | "prompt"
  | "requesting"
  | "locked"
  | "unsupported";

export type DialogRequestLocationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogRequestLocationMode;
  /** When true, overlay escape/outside close is blocked and the close icon is hidden. */
  dismissDisabled: boolean;
  lastErrorMessage?: string;
  onAllowLocation: () => void;
};

export default function DialogRequestLocation({
  open,
  onOpenChange,
  mode,
  dismissDisabled,
  lastErrorMessage,
  onAllowLocation,
}: DialogRequestLocationProps) {
  const title =
    mode === "unsupported"
      ? "Location not supported"
      : mode === "locked"
        ? "Application locked"
        : mode === "requesting"
          ? "Getting your location"
          : "Location required";

  const description =
    mode === "unsupported"
      ? "This browser does not expose geolocation. You cannot use this application until you switch to a supported environment."
      : mode === "locked"
        ? lastErrorMessage
          ? `${lastErrorMessage} You must allow precise location to continue. Reload the page after changing site permissions.`
          : "Location could not be obtained. This application cannot be used without an active location fix."
        : mode === "requesting"
          ? "Please respond to the browser prompt and wait while we read your position."
          : "This application requires your current location for compliance and audit. Choose Share location when your browser asks, then continue.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!dismissDisabled}
        onInteractOutside={(event) => {
          if (dismissDisabled) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (dismissDisabled) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-left">{description}</DialogDescription>
        </DialogHeader>
        {mode === "prompt" ? (
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" onClick={onAllowLocation}>
              Share location
            </Button>
          </DialogFooter>
        ) : null}
        {mode === "locked" || mode === "unsupported" ? (
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
          </DialogFooter>
        ) : null}
        {mode === "requesting" ? (
          <DialogFooter>
            <p className="text-muted-foreground text-sm">Waiting for GPS…</p>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
