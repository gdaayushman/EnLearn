"use client";
import { useEffect, useState } from "react";

export default function AdminContentPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [form, setForm] = useState({
    batchId: "", contentType: "video", title: "", embedUrl: "", fileUrl: "",
    durationMinutes: 0, isPreview: false, displayOrder: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { fetch("/api/batches").then(r => r.json()).then(setBatches); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const payload: any = { ...form, durationMinutes: Number(form.durationMinutes), displayOrder: Number(form.displayOrder) };
    const res = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setMsg("✓ Added"); setForm({ ...form, title: "", embedUrl: "", fileUrl: "" }); }
    else setMsg("✗ " + ((await res.json()).error ?? "Failed"));
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) { setMsg("✗ " + ((await res.json()).error ?? "Upload failed")); return; }
    const data = await res.json();
    setForm({ ...form, fileUrl: data.url });
    setMsg(`✓ Uploaded: ${data.url}`);
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Add content to a batch</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <div><label className="label">Batch</label>
          <select className="input" required value={form.batchId} onChange={set("batchId")}>
            <option value="">Select batch…</option>
            {batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Type</label>
            <select className="input" value={form.contentType} onChange={set("contentType")}>
              <option value="video">Video</option><option value="pdf">PDF</option>
              <option value="dpp">DPP</option><option value="test">Test</option><option value="link">Link</option>
            </select>
          </div>
          <div><label className="label">Order</label><input className="input" type="number" value={form.displayOrder} onChange={set("displayOrder")} /></div>
        </div>
        <div><label className="label">Title</label><input className="input" required value={form.title} onChange={set("title")} /></div>

        {form.contentType === "video" ? (
          <>
            <div><label className="label">YouTube embed URL <span className="text-slate-400">(recommended)</span></label>
              <input className="input" placeholder="https://www.youtube.com/embed/…" value={form.embedUrl} onChange={set("embedUrl")} />
            </div>
            <div className="text-center text-xs uppercase text-slate-400">or</div>
            <div><label className="label">Upload video file</label>
              <input type="file" accept="video/*" onChange={upload} className="input" disabled={uploading} />
              <p className="text-xs text-slate-500 mt-1">Uploaded URL goes into &quot;File URL&quot; below.</p>
            </div>
            <div><label className="label">Duration (minutes)</label>
              <input className="input" type="number" value={form.durationMinutes} onChange={set("durationMinutes")} />
            </div>
          </>
        ) : (
          <div><label className="label">Upload file / paste URL</label>
            <input type="file" onChange={upload} className="input mb-2" disabled={uploading} />
            <input className="input" placeholder="https://…" value={form.fileUrl} onChange={set("fileUrl")} />
          </div>
        )}

        {form.contentType === "video" && form.embedUrl === "" && (
          <div><label className="label">File URL (from upload)</label>
            <input className="input" value={form.fileUrl} onChange={set("fileUrl")} />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPreview} onChange={set("isPreview")} /> Free preview
        </label>

        {uploading && <p className="text-sm text-slate-500">Uploading…</p>}
        {msg && <p className="text-sm">{msg}</p>}
        <button className="btn-primary w-full">Add content</button>
      </form>
    </div>
  );
}
