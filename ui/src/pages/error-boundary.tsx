import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorBoundary() {
  const error = useRouteError();

  let title = "Something went wrong!";
  let description = "An unexpected error occurred while loading this page.";
  let details: string | null = null;

  if (isRouteErrorResponse(error)) {
    title = `Error ${error.status}`;
    description = error.statusText || description;
    details = JSON.stringify(
      {
        status: error.status,
        statusText: error.statusText,
        data: error.data,
      },
      null,
      2,
    );
  } else if (error instanceof Error) {
    details = `${error.name}: ${error.message}\n${error.stack ?? ""}`;
  } else if (error) {
    try {
      details = JSON.stringify(error, null, 2);
    } catch {
      details = String(error);
    }
  }

  console.error(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          {details ? (
            <pre className="max-h-64 overflow-auto rounded border bg-muted px-3 py-2 text-xs text-muted-foreground">
              {details}
            </pre>
          ) : null}
          <Button type="button" onClick={() => window.location.assign("/")}>
            Go Back Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
