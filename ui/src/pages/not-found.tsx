import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAGES } from "@/endpoints";
import { ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Page Not Found ;(</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The page you are looking for does not exist or has been moved.
          </p>
          <Button type="button" asChild>
            <Link to={PAGES.LOGIN}>
              <ArrowLeftIcon className="ml-2 h-4 w-4" />
              Go Back Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
