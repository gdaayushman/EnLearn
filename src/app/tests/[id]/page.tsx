"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Q = { id: string; questionText: string; marks: number; negativeMarks: number; options: { id: string; optionText: string }[] };

export default function TestPlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<any>(null);

  // ticking clock
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const timeLeftMs = deadline ? Math.max(0, deadline - now) : 0;
  const mm = String(Math.floor(timeLeftMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((timeLeftMs % 60000) / 1000)).padStart(2, "0");

  const submit = useCallback(async () => {
    if (!attemptId || result) return;
    const res = await fetch(`/api/tests/${params.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, answers }),
    });
    const data = await res.json();
    if (res.ok) setResult(data);
    else setError(data.error ?? "Submit failed");
  }, [attemptId, answers, params.id, result]);

  // auto-submit on timeout
  useEffect(() => {
    if (deadline && timeLeftMs === 0 && !result) submit();
  }, [timeLeftMs, deadline, result, submit]);

  async function start() {
    setLoading(true); setError(null);
    const res = await fetch(`/api/tests/${params.id}/start`, { method: "POST" });
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); setLoading(false); return; }
    const data = await res.json();
    setTest(data.test);
    setQuestions(data.questions);
    setAttemptId(data.attempt.id);
    setAnswers(data.attempt.answers ?? {});
    setDeadline(new Date(data.attempt.startedAt).getTime() + data.test.durationMinutes * 60_000);
    setStarted(true);
    setLoading(false);
  }

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  // ————— RESULT SCREEN —————
  if (result) {
    const pct = result.totalMarks ? Math.round((result.score / result.totalMarks) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold">Test submitted 🎉</h1>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Stat label="Score"  value={`${result.score}/${result.totalMarks}`} />
            <Stat label="Percent" value={`${pct}%`} />
            <Stat label="Rank"   value={`#${result.rank}`} />
          </div>
          <p className="mt-4 text-sm text-slate-500">Time taken: {result.timeTakenMinutes} min</p>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Solutions</h2>
          <ol className="space-y-4">
            {questions.map((q, i) => {
              const info = result.perQuestion[q.id];
              return (
                <li key={q.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="mb-2 text-sm text-slate-500">Q{i + 1} · {q.marks} mark(s)</div>
                  <div className="font-medium">{q.questionText}</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((o) => {
                      const isCorrect = info?.correctOptionId === o.id;
                      const isChosen = info?.chosenOptionId === o.id;
                      return (
                        <li key={o.id}
                          className={`rounded-lg px-3 py-2 ${
                            isCorrect ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                            : isChosen ? "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                            : "bg-slate-50 dark:bg-slate-800/50"
                          }`}>
                          {isCorrect && "✓ "}{isChosen && !isCorrect && "✗ "}{o.optionText}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
        <Link href="/profile" className="btn-primary w-full text-center">Back to profile</Link>
      </div>
    );
  }

  // ————— START LOBBY —————
  if (!started) {
    return (
      <div className="mx-auto max-w-xl card p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Ready to start the test?</h1>
        <p className="text-sm text-slate-500">Once started the timer cannot be paused.</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={start} disabled={loading} className="btn-primary w-full">
          {loading ? "Loading…" : "Start test"}
        </button>
      </div>
    );
  }

  // ————— TEST UI —————
  const q = questions[current];
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <aside className="card p-4 lg:col-span-1 h-fit sticky top-20 space-y-3">
        <div className="text-sm text-slate-500">{test.title}</div>
        <div className={`rounded-xl px-3 py-2 text-center font-mono text-lg ${
          timeLeftMs < 60_000 ? "bg-red-100 text-red-700" : "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
        }`}>
          {mm}:{ss}
        </div>
        <div className="text-xs text-slate-500">{answeredCount} / {questions.length} answered</div>
        <div className="grid grid-cols-5 gap-1">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              className={`aspect-square rounded-lg text-xs font-semibold ${
                i === current ? "ring-2 ring-brand-600"
                : answers[qq.id] ? "bg-emerald-500 text-white"
                : "bg-slate-100 dark:bg-slate-800"
              }`}
            >{i + 1}</button>
          ))}
        </div>
        <button onClick={submit} className="btn-primary w-full">Submit test</button>
      </aside>

      <section className="lg:col-span-3 space-y-4">
        <div className="card p-6 space-y-4">
          <div className="text-sm text-slate-500">
            Question {current + 1} / {questions.length} · {q.marks} mark(s)
            {q.negativeMarks ? ` · –${q.negativeMarks} on wrong` : ""}
          </div>
          <div className="text-lg font-medium">{q.questionText}</div>
          <ul className="space-y-2">
            {q.options.map((o) => (
              <li key={o.id}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  answers[q.id] === o.id
                    ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30"
                    : "border-slate-200 dark:border-slate-800"
                }`}>
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    checked={answers[q.id] === o.id}
                    onChange={() => setAnswers({ ...answers, [q.id]: o.id })}
                  />
                  <span>{o.optionText}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-between">
          <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} className="btn-ghost" disabled={current === 0}>← Previous</button>
          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)} className="btn-primary">Next →</button>
          ) : (
            <button onClick={submit} className="btn-primary">Submit</button>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
