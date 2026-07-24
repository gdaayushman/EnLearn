"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { optionText: string; isCorrect: boolean };
type Q = { questionText: string; marks: number; negativeMarks: number; explanation?: string; options: Opt[] };

function newQ(): Q {
  return { questionText: "", marks: 1, negativeMarks: 0, options: [
    { optionText: "", isCorrect: true },
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
  ]};
}

export default function NewTestPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<any[]>([]);
  const [form, setForm] = useState({
    batchId: "", title: "", description: "", testType: "mock", durationMinutes: 30,
  });
  const [questions, setQuestions] = useState<Q[]>([newQ()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { fetch("/api/batches").then(r => r.json()).then(setBatches); }, []);

  const totalMarks = questions.reduce((s, q) => s + Number(q.marks || 0), 0);

  function updateQ(i: number, patch: Partial<Q>) {
    setQuestions(qs => qs.map((q, j) => j === i ? { ...q, ...patch } : q));
  }
  function updateOpt(qi: number, oi: number, patch: Partial<Opt>) {
    setQuestions(qs => qs.map((q, j) => j !== qi ? q : {
      ...q,
      options: q.options.map((o, k) => k === oi ? { ...o, ...patch } : o),
    }));
  }
  function setCorrect(qi: number, oi: number) {
    setQuestions(qs => qs.map((q, j) => j !== qi ? q : {
      ...q,
      options: q.options.map((o, k) => ({ ...o, isCorrect: k === oi })),
    }));
  }
  function addOption(qi: number) {
    setQuestions(qs => qs.map((q, j) => j !== qi || q.options.length >= 6 ? q : {
      ...q, options: [...q.options, { optionText: "", isCorrect: false }],
    }));
  }
  function removeOption(qi: number, oi: number) {
    setQuestions(qs => qs.map((q, j) => j !== qi || q.options.length <= 2 ? q : {
      ...q, options: q.options.filter((_, k) => k !== oi),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const payload = {
      ...form,
      durationMinutes: Number(form.durationMinutes),
      questions: questions.map(q => ({
        ...q,
        marks: Number(q.marks),
        negativeMarks: Number(q.negativeMarks),
      })),
    };
    const res = await fetch("/api/tests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) router.push("/admin/tests");
    else { const data = await res.json(); setErr(JSON.stringify(data.error ?? "Failed")); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Create test</h1>

      <form onSubmit={submit} className="space-y-4">
        <div className="card p-5 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label">Batch</label>
              <select required className="input" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                <option value="">Select batch…</option>
                {batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div><label className="label">Type</label>
              <select className="input" value={form.testType} onChange={e => setForm({ ...form, testType: e.target.value })}>
                <option value="mock">Mock</option><option value="topic">Topic</option>
                <option value="pyq">PYQ</option><option value="live">Live</option>
              </select>
            </div>
            <div className="md:col-span-2"><label className="label">Title</label>
              <input required className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="md:col-span-2"><label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div><label className="label">Duration (minutes)</label>
              <input type="number" min={1} className="input" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
            </div>
            <div><label className="label">Total marks</label>
              <input readOnly className="input bg-slate-50 dark:bg-slate-800" value={totalMarks} />
            </div>
          </div>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Question {qi + 1}</div>
              <button type="button" onClick={() => setQuestions(qs => qs.filter((_, j) => j !== qi))}
                className="text-xs text-red-600 hover:underline">Remove</button>
            </div>
            <textarea required className="input" rows={2} placeholder="Question text"
              value={q.questionText} onChange={e => updateQ(qi, { questionText: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Marks</label>
                <input type="number" min={1} className="input" value={q.marks} onChange={e => updateQ(qi, { marks: Number(e.target.value) })} /></div>
              <div><label className="label">Negative marks</label>
                <input type="number" min={0} className="input" value={q.negativeMarks} onChange={e => updateQ(qi, { negativeMarks: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2">
              <div className="label">Options (tick the correct one)</div>
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`q_${qi}_correct`} checked={o.isCorrect} onChange={() => setCorrect(qi, oi)} />
                  <input required className="input flex-1" placeholder={`Option ${oi + 1}`}
                    value={o.optionText} onChange={e => updateOpt(qi, oi, { optionText: e.target.value })} />
                  <button type="button" onClick={() => removeOption(qi, oi)} className="btn-ghost text-xs">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => addOption(qi)} className="btn-ghost text-xs">+ Add option</button>
            </div>
          </div>
        ))}

        <button type="button" onClick={() => setQuestions(qs => [...qs, newQ()])} className="btn-ghost w-full">+ Add question</button>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "Saving…" : "Create test"}</button>
      </form>
    </div>
  );
}
