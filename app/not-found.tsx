import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="mt-8 text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
        404
      </p>
      <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em]">
        This page wandered off
      </h1>
      <p className="mt-2 max-w-sm text-[0.8125rem] leading-5 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Back to Hub</Link>
      </Button>
    </div>
  );
}
