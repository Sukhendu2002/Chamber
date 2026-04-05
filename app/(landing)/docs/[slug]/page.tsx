import { readFile } from "fs/promises";
import { join } from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import matter from "gray-matter";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconFileText } from "@tabler/icons-react";

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
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto max-w-3xl flex h-14 items-center justify-between px-4 sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              C
            </div>
            <span className="font-semibold">Chamber</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="default" size="sm" className="rounded-md">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        {/* Back Link */}
        <Link 
          href="/docs" 
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="h-4 w-4" />
          Back to docs
        </Link>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <div className="flex items-center gap-3 mb-6 not-prose">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconFileText className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
          </div>
          
          <div 
            className="prose-headings:scroll-mt-20 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:border"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto max-w-3xl flex flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
              C
            </div>
            <span className="text-sm font-medium">Chamber</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built by Sukhendu
          </p>
        </div>
      </footer>
    </div>
  );
}
