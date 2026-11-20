import * as React from "react";

import { cn } from "@/lib/utils";

export function PageShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1080px] px-5 py-7 sm:px-7 lg:px-10 lg:py-9",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2 text-[10.5px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.035em] sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-[560px] text-[13px] leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export function Card({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(16,16,24,0.02)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border/70 px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full border border-border bg-muted/35 text-muted-foreground/70">
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3.5 text-[13px] font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-[320px] text-[11.5px] leading-4.5 text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
