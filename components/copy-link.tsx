"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/ui";

/** A read-only link with a Copy button, for sharing invites. */
export function CopyLink({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The clipboard needs https or localhost; the link can still be selected by hand.
      setCopied(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        aria-label={label}
        className={`${inputClass} min-w-0 flex-1 font-mono text-xs`}
        readOnly
        value={value}
        onFocus={(e) => e.target.select()}
      />
      <Button variant="secondary" className="shrink-0" onClick={copy}>
        {copied ? "Copied ✓" : "Copy"}
      </Button>
    </div>
  );
}
