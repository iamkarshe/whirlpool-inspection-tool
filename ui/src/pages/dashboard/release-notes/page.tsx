import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReleaseNotesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Release notes</h1>
        <p className="text-muted-foreground text-sm">
          Track the changes and improvements shipped to the Whirlpool Inspection
          Tool.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>v1.0.0 &mdash; Initial release</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1.5">
          <p>&bull; Initial dashboard with analytics overview.</p>
          <p>&bull; Masters for users, product categories, products and warehouses.</p>
          <p>&bull; CSV import templates and improved empty states.</p>
        </CardContent>
      </Card>
    </div>
  );
}

