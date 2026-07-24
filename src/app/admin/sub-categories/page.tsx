"use client";
import { useEffect, useState } from "react";

export default function AdminSubCategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", categoryId: "", tags: "" });

  const load = async () => {
    setCats(await fetch("/api/categories").then(r => r.json()));
    setSubs(await fetch("/api/sub-categories").then(r => r.json()));
  };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/sub-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) }),
    });
    setForm({ name: "", categoryId: "", tags: "" }); load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sub-Categories</h1>
      <form onSubmit={create} className="card p-4 grid gap-3 md:grid-cols-4">
        <select className="input" required value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
          <option value="">Select category…</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input" placeholder="Sub-category name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <input className="input" placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
        <button className="btn-primary">Add</button>
      </form>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800"><tr><th className="p-3">Name</th><th>Category</th><th>Tags</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {subs.map(s => (
              <tr key={s.id}>
                <td className="p-3 font-medium">{s.name}</td>
                <td>{s.category?.name}</td>
                <td>{Array.isArray(s.tags) ? s.tags.join(", ") : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
