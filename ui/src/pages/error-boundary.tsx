import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorBoundary() {
  const error = useRouteError();

  let title = "Something went wrong";
  let description = "An unexpected error occurred while loading this page.";

  if (isRouteErrorResponse(error)) {
    title = `Error ${error.status}`;
    description = error.statusText || description;
  }

  // eslint-disable-next-line no-console
  console.error(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <Button type="button" onClick={() => window.location.assign("/")}>
            Go back home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

