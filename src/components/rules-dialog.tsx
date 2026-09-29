"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RulesDialog({ triggerClassName }: { triggerClassName?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className={triggerClassName} type="button">
          Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl italic">How Sevenfold plays</DialogTitle>
          <DialogDescription>
            A shared secret word, eight tries, and a winner measured in guesses.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-sm leading-6 text-foreground/90">
          <li>The word is seven letters. Everyone in the room has the same one.</li>
          <li>You get eight guesses. Green is the right letter in the right place.</li>
          <li>Marigold means the letter is in the word, but not in that spot. Slate means it is not in the word.</li>
          <li>
            Duplicate letters count. If the word has one L and you play two, only one L
            lights up — green first, then marigold.
          </li>
          <li>Fewest guesses wins. Solve it in the same number and you share the win.</li>
          <li>Eight misses and you are out. Your name stays on the room standings.</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
