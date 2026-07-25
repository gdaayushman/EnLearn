"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) { setErr((await res.json()).error ?? "Login failed"); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <h1 className="mb-4 text-2xl font-bold">Login</h1>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={loading} className="btn-primary w-full">{loading ? "…" : "Login"}</button>
        </form>
        <p className="mt-3 text-sm text-slate-500">
          No account? <Link href="/register" className="text-brand-600">Register</Link>
        </p>
      </div>
    </div>
  );
}
