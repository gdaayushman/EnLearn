"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Day = { day: number; subject: string; chapter: string; topic: string; generated: boolean; isToday: boolean };

export default function DailyDPPStrip({ batchId, batchSlug, enrolled }: { batchId: string; batchSlug: string; enrolled: boolean }) {
  const [state, setState] = useState<{ totalDays: number; currentDay: number; days: Day[] } | null>(null);

  useEffect(() => {
    fetch(`/api/batches/${batchId}/daily-dpp`).then(r => r.json()).then(setState);
  }, [batchId]);

  if (!state) return null;
  if (state.totalDays === 0) {
    return (
      <section className="card p-5">
        <h2 className="mb-2 text-lg font-semibold">📅 Daily DPPs</h2>
        <p className="text-sm text-slate-500">Curriculum not set for this batch yet. Ask the instructor to generate it.</p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">📅 Daily DPPs</h2>
        <span className="badge bg-brand-100 text-brand-700">Day {state.currentDay} of {state.totalDays}</span>
      </div>
      <ul className="max-h-96 space-y-2 overflow-auto pr-1">
        {[...state.days].reverse().map(d => (
          <li key={d.day}>
            <Link
              href={enrolled ? `/learn/${batchSlug}/dpp-${d.day}` : `/batches/${batchSlug}`}
              className={`flex items-center justify-between rounded-xl border p-3 transition ${
                d.isToday
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              }`}
            >
              <div>
                <div className="text-xs text-slate-500">
                  Day {d.day} · {d.subject} · {d.chapter}
                  {d.isToday && <span className="ml-2 text-brand-600 font-semibold">← Today</span>}
                </div>
                <div className="font-medium">{d.topic}</div>
              </div>
              <span className={`badge ${d.generated ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {d.generated ? "✓ Ready" : "New"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!enrolled && (
        <p className="mt-3 text-xs text-slate-500">Enroll in this batch to open the DPPs and get a fresh one every day.</p>
      )}
    </section>
  );
}
