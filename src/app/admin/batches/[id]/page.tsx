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
    </div>
  );
}
