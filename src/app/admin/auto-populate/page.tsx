"use client";
import { useState } from "react";

export default function AutoPopulateAllPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [videosPerSubject, setVideosPerSubject] = useState(2);
  const [onlyEmpty, setOnlyEmpty] = useState(true);

  async function run() {
    if (!confirm("This will search YouTube for many batches and use most of the daily API quota. Continue?")) return;
    setRunning(true); setResult(null);
    const res = await fetch("/api/batches/auto-populate-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onlyEmpty, videosPerSubject }),
    });
    setResult(await res.json());
    setRunning(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">✨ Auto-populate all batches</h1>
      <div className="card p-6 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Fetches YouTube videos + NCERT links for every batch. Runs sequentially with a small delay to stay under free API quota (100 searches/day).
        </p>
        <div className="grid gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyEmpty} onChange={e => setOnlyEmpty(e.target.checked)} />
            Only populate empty batches (≤2 items)
          </label>
          <div>
            <label className="label">Videos per subject (1-3)</label>
            <input type="number" min={1} max={3} value={videosPerSubject}
              onChange={e => setVideosPerSubject(Number(e.target.value))} className="input" />
            <p className="text-xs text-slate-500 mt-1">
              Each subject = 1 API call. 2 videos × 4 subjects = 4 calls per batch ⇒ ~25 batches/day on free quota.
            </p>
          </div>
        </div>
        <button onClick={run} disabled={running} className="btn-primary w-full">
          {running ? "Populating… (30s-2min)" : "Start auto-populate"}
        </button>
      </div>

      {result && (
        <div className="card p-6 space-y-2">
          <h2 className="font-semibold">Results — processed {result.processed} batches</h2>
          <ul className="text-sm max-h-96 overflow-auto space-y-1">
            {result.results?.map((r: any, i: number) => (
              <li key={i} className={`rounded-lg p-2 ${r.error ? "bg-red-50 dark:bg-red-900/30" : r.note ? "bg-amber-50 dark:bg-amber-900/30" : "bg-emerald-50 dark:bg-emerald-900/30"}`}>
                {r.batch && <><b>{r.batch}</b>: </>}
                {r.error ?? r.note ?? `+${r.videosInserted} videos, +${r.pdfsInserted} NCERT links`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
