"use client";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const load = () => fetch("/api/users").then(r => r.json()).then(setUsers);
  useEffect(() => { load(); }, []);

  async function changeRole(id: string, role: string) {
    await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    load();
  }
  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800">
            <tr><th className="p-3">Name</th><th>Email</th><th>User ID</th><th>Role</th><th>Active</th><th>Joined</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.map((u: any) => (
              <tr key={u.id}>
                <td className="p-3 font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{u.publicId}</code></td>
                <td>
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="sub_admin">sub_admin</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => toggleActive(u.id, !u.isActive)} className={`badge ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
