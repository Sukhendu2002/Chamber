import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  eyebrow?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return <div className={cn("page-shell", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  icon: Icon,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("page-header", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon aria-hidden={true} className="size-5 stroke-[1.8]" />
            </span>
          )}
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{description}</p>
          </div>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
