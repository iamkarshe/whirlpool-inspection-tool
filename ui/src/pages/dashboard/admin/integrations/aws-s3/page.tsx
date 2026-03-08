import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function IntegrationsAwsS3Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AWS S3 Bucket config</CardTitle>
        <CardDescription>
          Configure S3 buckets for storage (e.g. inspection attachments,
          exports).
        </CardDescription>
        <Badge variant="secondary" className="w-fit">
          Coming soon
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Bucket name, region, and credentials configuration will be available
          here.
        </p>
      </CardContent>
    </Card>
  );
}
