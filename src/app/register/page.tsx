"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { setErr((await res.json()).error ?? "Failed"); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <h1 className="mb-4 text-2xl font-bold">Create account</h1>
        <form onSubmit={submit} className="space-y-3">
          {(["name","email","phone","password"] as const).map((k) => (
            <div key={k}>
              <label className="label capitalize">{k}</label>
              <input className="input" type={k==="password"?"password":k==="email"?"email":"text"}
                     required={k!=="phone"} value={form[k]}
                     onChange={(e)=>setForm({...form,[k]:e.target.value})} />
            </div>
          ))}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full">Register</button>
        </form>
      </div>
    </div>
  );
}
