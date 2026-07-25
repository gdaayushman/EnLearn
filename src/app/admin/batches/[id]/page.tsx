"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditBatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dppState, setDppState] = useState({
    chapters: "Kinematics\nLaws of Motion\nWork Energy Power",
    subject: "",
    mcqCount: 8,
    integerCount: 2,
    difficulty: "mixed" as "easy" | "medium" | "hard" | "mixed",
    busy: false,
    result: "",
  });

  useEffect(() => {
    fetch(`/api/batches/${id}`).then(r => r.json()).then(setForm);
    fetch(`/api/sub-categories`).then(r => r.json()).then(setSubs);
  }, [id]);

  if (!form) return <p>Loading…</p>;

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function uploadThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) { const d = await res.json(); setForm({ ...form, thumbnailUrl: d.url }); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/batches/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, description: form.description, batchType: form.batchType,
        price: Number(form.price), discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : null,
        validityMonths: Number(form.validityMonths), language: form.language,
        thumbnailUrl: form.thumbnailUrl, isFree: !!form.isFree, isActive: !!form.isActive,
      }),
    });
    setMsg(res.ok ? "✓ Saved" : "✗ Failed");
  }

  async function del() {
    if (!confirm("Delete this batch and ALL its content?")) return;
    const res = await fetch(`/api/batches/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/batches");
  }

  async function autoPopulate() {
    if (!confirm("Search YouTube and add ~12 relevant videos + NCERT links to this batch?")) return;
    setMsg("🔎 Searching YouTube… this may take 10-20 seconds.");
    const res = await fetch(`/api/batches/${id}/auto-populate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videosPerSubject: 3, includeNcertPdfs: true }),
    });
    const data = await res.json();
    if (res.ok) setMsg(`✓ Added ${data.videosInserted} videos + ${data.pdfsInserted} NCERT links. Total content now: ${data.totalContentNow}`);
    else setMsg(`✗ ${data.error ?? "Failed"}`);
  }

  async function generateDPPs() {
    const chapters = dppState.chapters.split("\n").map(s => s.trim()).filter(Boolean);
    if (chapters.length === 0) { alert("Add at least one chapter"); return; }
    if (chapters.length > 5 && !confirm(`This will generate ${chapters.length} DPPs (~${chapters.length * 15} seconds). Continue?`)) return;
    setDppState(s => ({ ...s, busy: true, result: `🤖 Generating ${chapters.length} DPPs... this can take 15-45 seconds.` }));
    const res = await fetch(`/api/batches/${id}/generate-dpp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapters,
        subject: dppState.subject || undefined,
        mcqCount: Number(dppState.mcqCount),
        integerCount: Number(dppState.integerCount),
        difficulty: dppState.difficulty,
      }),
    });
    const data = await res.json();
    setDppState(s => ({
      ...s, busy: false,
      result: res.ok
        ? `✓ Generated ${data.generated} DPPs (${data.failed} failed).\n\n` +
          data.results.map((r: any) => r.error ? `✗ ${r.chapter}: ${r.error}` : `✓ ${r.chapter}: ${r.questions} questions`).join("\n")
        : `✗ ${data.error ?? "Failed"}`,
    }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Edit batch</h1>
      <form onSubmit={save} className="card p-6 space-y-4">
        <img src={form.thumbnailUrl} alt="" className="h-40 w-full rounded-xl object-cover" />
        <div><label className="label">Replace thumbnail</label>
          <input type="file" accept="image/*" onChange={uploadThumb} className="input" disabled={uploading} />
        </div>
        <div><label className="label">Name</label><input className="input" value={form.name} onChange={set("name")} /></div>
        <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description ?? ""} onChange={set("description")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Type</label>
            <select className="input" value={form.batchType} onChange={set("batchType")}>
              <option value="recorded">Recorded</option><option value="live">Live</option><option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div><label className="label">Language</label><input className="input" value={form.language} onChange={set("language")} /></div>
          <div><label className="label">Price</label><input type="number" className="input" value={form.price} onChange={set("price")} /></div>
          <div><label className="label">Discounted</label><input type="number" className="input" value={form.discountedPrice ?? ""} onChange={set("discountedPrice")} /></div>
          <div><label className="label">Validity (months)</label><input type="number" className="input" value={form.validityMonths} onChange={set("validityMonths")} /></div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFree} onChange={set("isFree")} /> Free batch</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={set("isActive")} /> Active</label>
        </div>
        {msg && <p className="text-sm">{msg}</p>}
        <div className="flex gap-3">
          <button className="btn-primary flex-1">Save</button>
          <button type="button" onClick={del} className="btn-ghost text-red-600">Delete</button>
        </div>
      </form>

      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold">📚 Curriculum & Daily DPPs</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The curriculum defines the ordered topic list (Subjects → Chapters → Topics). Each
          topic becomes one day&apos;s DPP — 20 fresh AI-generated questions. Set this up once
          per batch.
        </p>
        <a href={`/admin/batches/${id}/curriculum`} className="btn-primary w-full text-center">
          Manage curriculum →
        </a>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold">✨ Auto-populate content</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Search YouTube for educational videos matching this batch's exam/class,
          plus attach official NCERT reference links. Uses ~12 API calls (of 100/day free quota).
        </p>
        <button type="button" onClick={autoPopulate} className="btn-primary w-full">
          🔎 Auto-populate from YouTube
        </button>
        <p className="text-xs text-slate-500">
          Needs <code>YOUTUBE_API_KEY</code> env var. Get it at console.cloud.google.com → enable YouTube Data API v3.
        </p>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-semibold">🤖 Generate DPP PDFs</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          AI-generates original MCQ + integer questions for each chapter and creates a printable
          PDF with answer key & solutions. Questions are original (not scraped) — safe & copyright-free.
        </p>

        <div>
          <label className="label">Chapters (one per line)</label>
          <textarea
            className="input font-mono text-sm"
            rows={4}
            value={dppState.chapters}
            onChange={e => setDppState({ ...dppState, chapters: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Subject (optional)</label>
            <input className="input" placeholder="Auto-detected from batch"
              value={dppState.subject}
              onChange={e => setDppState({ ...dppState, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={dppState.difficulty}
              onChange={e => setDppState({ ...dppState, difficulty: e.target.value as any })}>
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="label">MCQ per chapter</label>
            <input type="number" min={2} max={20} className="input"
              value={dppState.mcqCount}
              onChange={e => setDppState({ ...dppState, mcqCount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Integer questions per chapter</label>
            <input type="number" min={0} max={10} className="input"
              value={dppState.integerCount}
              onChange={e => setDppState({ ...dppState, integerCount: Number(e.target.value) })} />
          </div>
        </div>

        <button type="button" onClick={generateDPPs} disabled={dppState.busy} className="btn-primary w-full">
          {dppState.busy ? "Generating... (15-45s)" : "🤖 Generate DPPs"}
        </button>

        {dppState.result && (
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">{dppState.result}</pre>
        )}
        <p className="text-xs text-slate-500">
          Needs <code>GEMINI_API_KEY</code>. Get free at aistudio.google.com/apikey (no credit card, 1500 requests/day).
        </p>
      </div>
    </div>
  );
}
