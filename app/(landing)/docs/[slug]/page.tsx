import { readFile } from "fs/promises";
import { join } from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import matter from "gray-matter";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconFileText, IconSparkles } from "@tabler/icons-react";

interface DocPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const docSlugs: Record<string, { title: string; file: string }> = {
  "getting-started": { title: "Getting Started", file: "getting-started.md" },
  "expenses": { title: "Expense Tracking", file: "features/expenses.md" },
  "accounts": { title: "Account Management", file: "features/accounts.md" },
  "loans": { title: "Loan Tracking", file: "features/loans.md" },
  "subscriptions": { title: "Subscriptions", file: "features/subscriptions.md" },
  "telegram-bot": { title: "Telegram Bot", file: "features/telegram-bot.md" },
  "faq": { title: "FAQ", file: "faq.md" },
  "troubleshooting": { title: "Troubleshooting", file: "troubleshooting.md" },
};

async function getDocContent(slug: string): Promise<{ title: string; content: string } | null> {
  const doc = docSlugs[slug];
  if (!doc) return null;

  try {
    const filePath = join(process.cwd(), "docs", doc.file);
    const fileContent = await readFile(filePath, "utf-8");
    const { content } = matter(fileContent);
    
    const processedContent = await remark()
      .use(remarkGfm)
      .use(remarkHtml, { sanitize: false })
      .process(content);
    
    return {
      title: doc.title,
      content: processedContent.toString(),
    };
  } catch {
    return null;
  }
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = await getDocContent(slug);
  
  if (!doc) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:h-[4.5rem]">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-[-0.04em]">
            <span>Chamber</span>
            <IconSparkles aria-hidden="true" className="size-4 fill-primary/15 text-primary" />
          </Link>
          <Link href="/dashboard">
            <Button variant="default" size="sm">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Back Link */}
        <Link 
          href="/docs" 
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="h-4 w-4" />
          Back to docs
        </Link>

        <article className="max-w-none">
          {/* Title Header */}
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <IconFileText className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{doc.title}</h1>
          </div>
          
          {/* Markdown Content with Prose */}
          <div 
            className="prose prose-slate dark:prose-invert prose-lg max-w-none
              prose-headings:font-semibold prose-headings:tracking-tight prose-headings:mt-8 prose-headings:mb-4
              prose-h1:text-3xl prose-h1:font-bold
              prose-h2:text-2xl prose-h2:font-semibold prose-h2:border-b prose-h2:pb-2
              prose-h3:text-xl prose-h3:font-medium
              prose-p:leading-7 prose-p:my-4
              prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
              prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
              prose-li:my-1 prose-li:marker:text-muted-foreground
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
              prose-strong:font-semibold prose-strong:text-foreground
              prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono
              prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-xl
              prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4
              prose-table:w-full prose-table:my-4 prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted prose-td:border prose-td:border-border prose-td:p-2
              prose-img:rounded-2xl prose-img:my-4 prose-img:border
              prose-hr:my-8"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto max-w-4xl flex flex-col items-center gap-2 px-4 py-8 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Chamber</span>
            <IconSparkles aria-hidden="true" className="size-3.5 fill-primary/15 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Built by Sukhendu
          </p>
        </div>
      </footer>
    </div>
  );
}
