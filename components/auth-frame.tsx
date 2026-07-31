import type { ReactNode } from "react";
import Link from "next/link";
import {
  IconChartLine,
  IconReceipt,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";

interface AuthFrameProps {
  children: ReactNode;
  title: string;
  description: string;
}

const benefits = [
  { label: "Track every transaction", icon: IconReceipt },
  { label: "Understand spending trends", icon: IconChartLine },
  { label: "Keep financial data private", icon: IconShieldCheck },
];

export function AuthFrame({ children, title, description }: AuthFrameProps) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-6">
      <div aria-hidden="true" className="absolute -left-40 top-12 size-96 rounded-full bg-primary/8 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-32 bottom-0 size-80 rounded-full bg-chart-2/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-md border border-border bg-card shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden flex-col justify-between bg-primary p-8 text-primary-foreground lg:flex">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-semibold tracking-[-0.045em]">
            Chamber
            <IconSparkles aria-hidden="true" className="size-4 fill-current/15" />
          </Link>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground/70">
              Personal finance, clarified
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-semibold tracking-[-0.045em]">
              {title}
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-primary-foreground/75">
              {description}
            </p>
            <div className="mt-6 space-y-2">
              {benefits.map((benefit) => (
                <div key={benefit.label} className="flex items-center gap-3 text-sm font-medium">
                  <span className="flex size-9 items-center justify-center rounded-md bg-white/10">
                    <benefit.icon aria-hidden="true" className="size-4" />
                  </span>
                  {benefit.label}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-primary-foreground/60">Secure authentication powered by Clerk</p>
        </section>

        <section className="flex min-h-[34rem] items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-7 inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.04em] lg:hidden"
            >
              Chamber
              <IconSparkles aria-hidden="true" className="size-4 fill-primary/15 text-primary" />
            </Link>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
