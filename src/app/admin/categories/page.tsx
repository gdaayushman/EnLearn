"use client";
import { useEffect, useState } from "react";

type Cat = { id: string; name: string; slug: string; isPaid: boolean; displayOrder: number };

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [form, setForm] = useState({ name: "", isPaid: false, displayOrder: 0 });
  const load = () => fetch("/api/categories").then(r => r.json()).then(setCats);
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ name: "", isPaid: false, displayOrder: 0 });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" }); load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Categories</h1>
      <form onSubmit={create} className="card p-4 grid gap-3 md:grid-cols-4">
        <input className="input md:col-span-2" placeholder="Category name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPaid} onChange={e => setForm({...form, isPaid: e.target.checked})} /> Paid
        </label>
        <button className="btn-primary">Add</button>
      </form>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800">
            <tr><th className="p-3">Name</th><th>Slug</th><th>Paid</th><th>Order</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {cats.map(c => (
              <tr key={c.id}>
                <td className="p-3 font-medium">{c.name}</td>
                <td>{c.slug}</td>
                <td>{c.isPaid ? "Yes" : "No"}</td>
                <td>{c.displayOrder}</td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(c.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
