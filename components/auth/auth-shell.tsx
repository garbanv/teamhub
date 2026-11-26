import Link from "next/link";
import { Check, Command } from "lucide-react";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

function MockTask({
  title,
  code,
  status,
  statusColor,
  initials,
  avatarClass,
  done,
}: {
  title: string;
  code: string;
  status: string;
  statusColor: string;
  initials: string;
  avatarClass: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3 first:border-t-0">
      <span
        className={cn(
          "flex size-[15px] shrink-0 items-center justify-center rounded-[5px] border",
          done
            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
            : "border-white/15",
        )}
      >
        {done && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[0.7812rem] font-medium text-white/85",
            done && "text-white/40 line-through",
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 font-mono text-[0.5938rem] tracking-wide text-white/30">
          {code}
        </p>
      </div>
      <span
        className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.5938rem] font-medium text-white/60 sm:inline-flex"
        title={status}
      >
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        {status}
      </span>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-[0.5312rem] font-semibold text-white",
          avatarClass,
        )}
      >
        {initials}
      </span>
    </div>
  );
}

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#0d0d12] lg:flex lg:flex-col">
        <div className="dot-grid absolute inset-0 opacity-[0.16]" />
        <div className="pointer-events-none absolute -top-40 -left-24 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(249,115,98,0.22),transparent_66%)] blur-2xl" />
        <div className="pointer-events-none absolute right-[-18%] bottom-[-10%] size-[640px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.25),transparent_65%)] blur-2xl" />
        <div className="pointer-events-none absolute top-[18%] right-[14%] size-2 rounded-full bg-brand/60 shadow-[0_0_30px_6px_rgba(249,115,98,0.25)]" />

        <div className="relative z-10 flex items-center justify-between px-10 py-8">
          <Logo className="text-white [&>span:last-child]:text-white" />
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.625rem] font-medium tracking-wide text-white/45">
            Team workspace
          </span>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-10 pb-8 xl:px-16">
          <div className="max-w-[30rem]">
            <p className="mb-5 flex items-center gap-2 text-[0.6875rem] font-medium tracking-[0.14em] text-white/40 uppercase">
              <span className="h-px w-5 bg-brand/80" />
              Focus, together
            </p>
            <h1 className="text-balance text-[2.5rem] leading-[1.08] font-semibold tracking-[-0.035em] text-white xl:text-[2.875rem]">
              The calm center of your team&apos;s work.
            </h1>
            <p className="mt-5 max-w-[24.375rem] text-[0.875rem] leading-6 text-white/45">
              Projects, tasks, and the conversations around them — organized in
              one fast, quiet place.
            </p>
          </div>

          <div className="relative mt-12 max-w-[29.375rem]">
            <div className="absolute -inset-3 rounded-[20px] bg-gradient-to-br from-white/[0.05] to-transparent blur-xl" />
            <div className="relative overflow-hidden rounded-[14px] border border-white/[0.09] bg-[#141419]/90 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.75)] backdrop-blur">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-[7px] bg-indigo-500/15 text-[0.625rem] font-semibold text-indigo-300">
                    W
                  </span>
                  <div>
                    <p className="text-[0.75rem] font-medium text-white/80">
                      Website refresh
                    </p>
                    <p className="text-[0.5938rem] text-white/30">WEB · Q4 launch</p>
                  </div>
                </div>
                <div className="flex -space-x-1.5">
                  <span className="flex size-5 items-center justify-center rounded-full border border-[#141419] bg-rose-400/80 text-[0.4375rem] font-semibold text-white">
                    PS
                  </span>
                  <span className="flex size-5 items-center justify-center rounded-full border border-[#141419] bg-amber-400/80 text-[0.4375rem] font-semibold text-white">
                    JW
                  </span>
                  <span className="flex size-5 items-center justify-center rounded-full border border-[#141419] bg-teal-400/80 text-[0.4375rem] font-semibold text-white">
                    MC
                  </span>
                </div>
              </div>
              <MockTask
                title="Refine onboarding flow"
                code="WEB-42"
                status="In progress"
                statusColor="#eab308"
                initials="PS"
                avatarClass="bg-rose-400/40"
              />
              <MockTask
                title="Write launch announcement"
                code="WEB-43"
                status="Todo"
                statusColor="#94a3b8"
                initials="JW"
                avatarClass="bg-amber-400/40"
              />
              <MockTask
                title="QA the pricing page"
                code="WEB-44"
                status="Done"
                statusColor="#22c55e"
                initials="MC"
                avatarClass="bg-teal-400/40"
                done
              />
            </div>

            <div className="absolute -right-4 -bottom-7 hidden items-center gap-2 rounded-lg border border-white/10 bg-[#1a1a21]/95 px-3 py-2.5 shadow-xl backdrop-blur sm:flex">
              <span className="flex size-7 items-center justify-center rounded-md bg-emerald-400/10 text-emerald-300">
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-[0.6562rem] font-medium text-white/75">
                  Sprint 24
                </p>
                <p className="text-[0.5625rem] text-white/35">86% complete</p>
              </div>
              <span className="ml-3 flex size-7 items-center justify-center rounded-md border border-white/10 text-[0.5625rem] text-white/45">
                3d
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/[0.06] px-10 py-5 text-[0.6562rem] text-white/30 xl:px-16">
          <span>Built for focused teams.</span>
          <span className="flex items-center gap-1.5">
            <Command className="size-3" />
            <span>K to move faster</span>
          </span>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-6 lg:px-10">
          <Link
            href="/"
            className="lg:invisible"
            aria-label="Hub home"
          >
            <Logo />
          </Link>
          <span className="text-[0.6875rem] text-muted-foreground/70">
            {footer}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-20">
          <div className="w-full max-w-[22.25rem] animate-rise">{children}</div>
        </div>
        <div className="px-6 py-5 text-center text-[0.6562rem] text-muted-foreground/60">
          © {new Date().getFullYear()} Hub · Calm software for busy teams
        </div>
      </main>
    </div>
  );
}
