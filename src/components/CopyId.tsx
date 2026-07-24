"use client";
import { useState } from "react";

export default function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1 flex items-center gap-2">
      <code className="flex-1 truncate rounded bg-white px-2 py-1 text-sm text-brand-700 dark:bg-slate-900">
        {value}
      </code>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="btn-ghost text-xs"
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}
