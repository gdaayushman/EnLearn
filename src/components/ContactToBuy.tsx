"use client";
import { useState } from "react";
import Link from "next/link";
import { CONTACT, buildDmMessage } from "@/lib/config";

type Props = {
  batchId: string;
  batchName: string;
  amount: number | string | null;
  user: null | { publicId: string; name: string };
  hasPendingRequest: boolean;
};

export default function ContactToBuy(props: Props) {
  const [copied, setCopied] = useState(false);
  const [requestSent, setRequestSent] = useState(props.hasPendingRequest);
  const [error, setError] = useState<string | null>(null);

  const message = props.user
    ? buildDmMessage({ batchName: props.batchName, publicId: props.user.publicId, amount: props.amount })
    : `Hi! I want to buy "${props.batchName}"${props.amount ? ` (₹${props.amount})` : ""}.`;

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function logRequestAndOpen() {
    setError(null);
    if (props.user && !requestSent) {
      const res = await fetch("/api/enrollment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: props.batchId }),
      });
      if (res.ok) setRequestSent(true);
      else setError("Couldn't log your request — you can still DM us.");
    }
    // Try to copy the message so it's ready to paste in DM
    try { await navigator.clipboard.writeText(message); setCopied(true); } catch {}
    window.open(CONTACT.instagramUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-3">
      {!props.user && (
        <p className="text-xs text-slate-500">
          Tip: <Link href="/login" className="text-brand-600 underline">login</Link> first so we can match your DM to your account.
        </p>
      )}

      {props.user && (
        <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Your User ID</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="rounded bg-white px-2 py-1 text-brand-700 dark:bg-slate-900">{props.user.publicId}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(props.user!.publicId); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="btn-ghost text-xs"
            >
              {copied ? "Copied!" : "Copy ID"}
            </button>
          </div>
          <p className="mt-2 text-slate-500">Share this ID in the DM so we can approve your access instantly.</p>
        </div>
      )}

      <button
        onClick={logRequestAndOpen}
        className="btn-primary w-full bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 hover:opacity-90"
      >
        📸 Contact on Instagram to buy
      </button>

      <div className="rounded-xl border border-dashed border-slate-300 p-3 text-xs dark:border-slate-700">
        <div className="mb-1 font-semibold">Message to send:</div>
        <p className="mb-2 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{message}</p>
        <div className="flex gap-2">
          <button onClick={copy} className="btn-ghost text-xs flex-1">{copied ? "✓ Copied" : "Copy message"}</button>
          <a
            href={CONTACT.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs flex-1 text-center"
          >
            Open @{CONTACT.instagramHandle}
          </a>
        </div>
      </div>

      {requestSent && (
        <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          ✓ Request logged. Once you DM and payment is confirmed, we&apos;ll unlock the batch for you.
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
