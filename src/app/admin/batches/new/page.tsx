"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBatchPage() {
  const router = useRouter();
  const [subs, setSubs] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", subCategoryId: "", description: "", batchType: "recorded",
    price: 0, discountedPrice: 0, validityMonths: 12, language: "Hinglish",
    thumbnailUrl: "https://picsum.photos/seed/newbatch/640/360", isFree: false,
  });

  useEffect(() => { fetch("/api/sub-categories").then(r=>r.json()).then(setSubs); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/batches", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price), discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined, validityMonths: Number(form.validityMonths) }),
    });
    if (res.ok) router.push("/admin/batches");
    else alert("Failed to create batch");
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Create batch</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <div><label className="label">Name</label><input className="input" required value={form.name} onChange={set("name")} /></div>
        <div><label className="label">Sub-category</label>
          <select className="input" required value={form.subCategoryId} onChange={set("subCategoryId")}>
            <option value="">Select…</option>
            {subs.map((s:any) => <option key={s.id} value={s.id}>{s.category?.name} · {s.name}</option>)}
          </select>
        </div>
        <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={set("description")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Type</label>
            <select className="input" value={form.batchType} onChange={set("batchType")}>
              <option value="recorded">Recorded</option><option value="live">Live</option><option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div><label className="label">Language</label><input className="input" value={form.language} onChange={set("language")} /></div>
          <div><label className="label">Price (₹)</label><input className="input" type="number" value={form.price} onChange={set("price")} /></div>
          <div><label className="label">Discounted (₹)</label><input className="input" type="number" value={form.discountedPrice} onChange={set("discountedPrice")} /></div>
          <div><label className="label">Validity (months)</label><input className="input" type="number" value={form.validityMonths} onChange={set("validityMonths")} /></div>
          <div><label className="label">Thumbnail URL</label><input className="input" value={form.thumbnailUrl} onChange={set("thumbnailUrl")} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isFree} onChange={set("isFree")} /> Free batch
        </label>
        <button className="btn-primary w-full">Create</button>
      </form>
    </div>
  );
}
