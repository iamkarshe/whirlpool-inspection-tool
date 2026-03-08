import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function IntegrationsOktaPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Okta SSO</CardTitle>
        <CardDescription>
          Configure Okta as your identity provider for single sign-on.
        </CardDescription>
        <Badge variant="secondary" className="w-fit">
          Coming soon
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Domain, client ID, and redirect URI configuration will be available
          here.
        </p>
      </CardContent>
    </Card>
  );
}
