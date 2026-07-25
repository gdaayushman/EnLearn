"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function BatchCurriculumPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [json, setJson] = useState("");

  const load = () => fetch(`/api/batches/${id}/curriculum`).then(r => r.json()).then(d => {
    setData(d);
    setJson(JSON.stringify(d.curriculum ?? { subjects: [] }, null, 2));
  });

  useEffect(() => { load(); }, [id]);

  async function generate() {
    if (data?.curriculum && !confirm("Replace the existing curriculum? Cached daily DPPs will keep working but new days will follow the new outline.")) return;
    setBusy(true); setMsg("🤖 AI is designing your batch's full topic-by-topic curriculum. This takes 15-30s…");
    const res = await fetch(`/api/batches/${id}/curriculum`, { method: "POST" });
    const d = await res.json();
    setBusy(false);
    setMsg(res.ok ? `✓ Generated ${d.totalDays} topic-days across ${d.subjects.length} subjects` : `✗ ${d.error}`);
    load();
  }

  async function saveManual() {
    let parsed: any;
    try { parsed = JSON.parse(json); }
    catch { setMsg("✗ Invalid JSON"); return; }
    const res = await fetch(`/api/batches/${id}/curriculum`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curriculum: parsed }),
    });
    const d = await res.json();
    setMsg(res.ok ? `✓ Saved. Total days: ${d.totalDays}` : `✗ ${d.error}`);
    setEditing(false); load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/admin/batches/${id}`} className="text-sm text-brand-600">← Back to batch edit</Link>
      <h1 className="text-2xl font-bold">📚 Batch curriculum</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        This ordered outline of <b>subjects → chapters → topics</b> drives the Daily DPP progression.
        Day 1 uses topic 1, Day 2 uses topic 2, and so on. AI generates it in one click.
      </p>

      <div className="flex gap-3">
        <button onClick={generate} disabled={busy} className="btn-primary flex-1">
          {busy ? "Generating…" : data?.curriculum ? "🔄 Regenerate curriculum" : "🤖 Generate curriculum with AI"}
        </button>
        {data?.curriculum && (
          <button onClick={() => setEditing(!editing)} className="btn-ghost">
            {editing ? "Cancel edit" : "✏️ Edit JSON"}
          </button>
        )}
      </div>
      {msg && <p className="text-sm">{msg}</p>}

      {editing ? (
        <div className="card p-4 space-y-3">
          <textarea className="input font-mono text-xs" rows={20} value={json} onChange={e => setJson(e.target.value)} />
          <button onClick={saveManual} className="btn-primary w-full">Save curriculum</button>
        </div>
      ) : data?.curriculum ? (
        <div className="card p-5 space-y-4">
          <div className="text-sm text-slate-500">Total days: <b>{data.totalDays}</b></div>
          {data.curriculum.subjects.map((s: any) => (
            <div key={s.name}>
              <h3 className="text-lg font-semibold text-brand-700">{s.name}</h3>
              <ul className="ml-4 mt-1 space-y-2">
                {s.chapters.map((c: any) => (
                  <li key={c.name}>
                    <div className="font-medium">{c.name}</div>
                    <ol className="ml-6 list-decimal text-sm text-slate-600 dark:text-slate-300">
                      {c.topics.map((t: string) => <li key={t}>{t}</li>)}
                    </ol>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-slate-500">
          No curriculum yet. Click <b>Generate</b> above.
        </div>
      )}
    </div>
  );
}
