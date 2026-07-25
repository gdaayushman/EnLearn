"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Q =
  | { type: "mcq"; question: string; options: string[]; correctIndex: number; explanation: string; marks: number }
  | { type: "integer"; question: string; answer: number; explanation: string; marks: number };

export default function DPPViewer({ batchId, batchSlug, day }: { batchId: string; batchSlug: string; day: number }) {
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setState(null); setError(null); setAnswers({}); setSubmitted(false);
    fetch(`/api/batches/${batchId}/daily-dpp/${day}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
        return r.json();
      })
      .then(setState)
      .catch(e => setError(e.message));
  }, [batchId, day]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl card p-8 text-center space-y-3">
        <h1 className="text-xl font-semibold text-red-600">Couldn&apos;t load Day {day}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <Link href={`/batches/${batchSlug}`} className="btn-primary inline-flex">Back to batch</Link>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="mx-auto max-w-xl card p-8 text-center space-y-2">
        <div className="animate-pulse text-4xl">🤖</div>
        <h1 className="text-lg font-semibold">Preparing your DPP…</h1>
        <p className="text-sm text-slate-500">If this is Day {day}&apos;s first open, we&apos;re generating 20 fresh questions on today&apos;s topic. This takes 10-30 seconds.</p>
      </div>
    );
  }

  const questions: Q[] = state.questions;

  let score = 0, maxScore = 0;
  if (submitted) {
    for (let i = 0; i < questions.length; i++) {
      maxScore += questions[i].marks;
      const q = questions[i];
      if (q.type === "mcq" && answers[i] === q.correctIndex) score += q.marks;
      if (q.type === "integer" && Number(answers[i]) === q.answer) score += q.marks;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card p-5">
        <div className="text-sm text-slate-500">Day {state.day} · {state.subject} · {state.chapter}</div>
        <h1 className="text-2xl font-bold">📝 {state.topic}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {questions.length} original questions · {questions.reduce((s, q) => s + q.marks, 0)} marks total
        </p>
      </div>

      {questions.map((q, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">Q{i + 1} · {q.marks} marks</div>
            <span className="badge bg-slate-100 text-slate-700">{q.type === "mcq" ? "MCQ" : "Integer"}</span>
          </div>
          <div className="font-medium whitespace-pre-wrap">{q.question}</div>

          {q.type === "mcq" ? (
            <ul className="space-y-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[i] === oi;
                const isCorrect = submitted && q.correctIndex === oi;
                const isWrong = submitted && chosen && q.correctIndex !== oi;
                return (
                  <li key={oi}>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                      isCorrect ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                      : isWrong ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                      : chosen ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                      : "border-slate-200 dark:border-slate-800"
                    }`}>
                      <input type="radio" disabled={submitted}
                        checked={chosen}
                        onChange={() => setAnswers({ ...answers, [i]: oi })} />
                      <span>({["A","B","C","D"][oi]}) {opt}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div>
              <input
                type="number"
                disabled={submitted}
                className={`input max-w-xs ${
                  submitted ? (Number(answers[i]) === q.answer ? "border-emerald-500" : "border-red-500") : ""
                }`}
                placeholder="Your integer answer"
                value={answers[i] ?? ""}
                onChange={e => setAnswers({ ...answers, [i]: e.target.value })}
              />
              {submitted && <p className="mt-1 text-sm text-emerald-600 font-semibold">Correct answer: {q.answer}</p>}
            </div>
          )}

          {submitted && q.explanation && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
              <div className="font-semibold text-slate-700 dark:text-slate-300">Explanation</div>
              <p className="whitespace-pre-wrap">{q.explanation}</p>
            </div>
          )}
        </div>
      ))}

      {!submitted ? (
        <button onClick={() => setSubmitted(true)} className="btn-primary w-full">Submit DPP</button>
      ) : (
        <div className="card p-6 text-center space-y-2">
          <div className="text-4xl">{score >= maxScore * 0.6 ? "🎉" : "💪"}</div>
          <div className="text-2xl font-bold">{score} / {maxScore}</div>
          <p className="text-sm text-slate-500">{score >= maxScore * 0.6 ? "Great work!" : "Review the explanations and try again tomorrow."}</p>
          <Link href={`/batches/${batchSlug}`} className="btn-ghost">Back to batch</Link>
        </div>
      )}
    </div>
  );
}
