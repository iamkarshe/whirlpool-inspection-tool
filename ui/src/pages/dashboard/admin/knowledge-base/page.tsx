import PageActionBar from "@/components/page-action-bar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getKbArticles,
  kbCategories,
  type KbArticle,
  type KbCategory,
} from "@/pages/dashboard/admin/knowledge-base/knowledge-base-service";
import { Copy, Terminal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function CopyableCommand({
  command,
  helperText,
}: {
  command: string;
  helperText?: string;
}) {
  const copy = useCallback(() => {
    navigator.clipboard.writeText(command).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Failed to copy"),
    );
  }, [command]);

  return (
    <div>
      <div className="relative group rounded-lg border-2 border-double border-border/50 bg-muted/40 text-[13px] shadow-sm">
        <pre className="overflow-x-auto p-4 pr-14 whitespace-pre-wrap break-all text-foreground/90">
          {command}
        </pre>
        <Button
          type="button"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 gap-1.5 bg-primary/15 text-primary hover:bg-primary/25 border-0 shadow-none"
          onClick={copy}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
      {helperText && (
        <p className="text-muted-foreground w-[95%] mx-auto rounded-b-lg border border-t-0 border-border/50 bg-slate-50/90 dark:bg-slate-900/70 dark:border-slate-700/60 px-3 py-2 text-xs leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
}

function ArticleAccordionItem({ article }: { article: KbArticle }) {
  return (
    <AccordionItem
      value={article.id}
      className="border-border/60 last:border-b-0"
    >
      <AccordionTrigger className="py-5 hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40 [&[data-state=open]]:bg-muted/30">
        <div className="flex flex-wrap items-center gap-2.5 text-left px-2 py-1">
          <Badge
            variant="secondary"
            className="font-normal text-[11px] uppercase tracking-wide"
            style={{ minWidth: "100px" }}
          >
            {article.category}
          </Badge>
          <span className="font-semibold text-foreground">{article.title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-5 pt-1">
        <div className="space-y-6 rounded-lg bg-muted/20 p-5">
          <div className="space-y-1.5">
            <h4 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Issue
            </h4>
            <p className="text-sm leading-relaxed text-foreground/90">
              {article.issue}
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Solution
            </h4>
            <p className="text-sm leading-relaxed text-foreground/90">
              {article.solution}
            </p>
          </div>
          {article.commands.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                <Terminal className="h-3.5 w-3.5" />
                Commands
              </h4>
              <div className="space-y-4">
                {article.commands.map((block, i) => (
                  <CopyableCommand
                    key={`${article.id}-cmd-${i}`}
                    command={block.command}
                    helperText={block.commandHelper}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKbArticles().then((data) => {
      setArticles(data);
      setLoading(false);
    });
  }, []);

  const filtered = articles.filter((a) => {
    const matchCategory =
      category === "all" || a.category === (category as KbCategory);
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()) ||
      a.issue.toLowerCase().includes(search.toLowerCase()) ||
      a.solution.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Knowledge Base"
        description="Troubleshooting guides and copy-paste commands for PostgreSQL, FastAPI, React, Okta, AWS, Docker, and network issues."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Input
          placeholder="Search by title, category, or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-background"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {kbCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <span className="text-muted-foreground text-sm">
            {filtered.length} article{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center p-10">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground flex min-h-[200px] flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm font-medium">
              No articles match your filters.
            </p>
            <p className="text-xs">Try a different search or category.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filtered.map((article) => (
              <ArticleAccordionItem key={article.id} article={article} />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
