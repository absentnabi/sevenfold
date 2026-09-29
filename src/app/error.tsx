"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-4xl italic">Something slipped.</h1>
        <p className="mt-2 text-muted-foreground">The board hit a snag. Try that again.</p>
        <Button className="mt-6 h-11 px-5" onClick={reset} type="button">
          Try again
        </Button>
      </div>
    </main>
  );
}
