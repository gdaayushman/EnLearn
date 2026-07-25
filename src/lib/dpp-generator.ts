/**
 * DPP question generator. Uses Google Gemini's free tier to generate original,
 * copyright-free JEE/NEET/Boards-style questions on any topic.
 *
 * Free key: aistudio.google.com/apikey (no credit card)
 * Free quota: 15 req/min, 1500/day. Each daily-DPP = 1 request.
 */

export type DPPQuestion =
  | { type: "mcq"; question: string; options: string[]; correctIndex: number; explanation: string; marks: number }
  | { type: "integer"; question: string; answer: number; explanation: string; marks: number };

export type DPPSpec = {
  chapter: string;
  topic?: string;       // if set → generate questions on this specific topic
  subject: string;
  exam: string;
  cls?: string;
  mcqCount: number;
  integerCount: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
};

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function buildPrompt(spec: DPPSpec): string {
  const level = spec.exam === "JEE" ? "JEE Main level"
              : spec.exam === "NEET" ? "NEET UG level"
              : spec.exam === "CBSE Boards" ? "CBSE Board exam level"
              : `${spec.exam} entrance level`;
  const cls = spec.cls ? `Class ${spec.cls} ` : "";
  const diff = spec.difficulty === "mixed" || !spec.difficulty ? "mix of easy, medium, and hard" : spec.difficulty;
  const focus = spec.topic
    ? `Chapter: "${spec.chapter}"\nSpecific topic to focus on: "${spec.topic}"\nAll questions MUST test this specific topic (not other sub-topics of the chapter).`
    : `Chapter: "${spec.chapter}" — cover major concepts across the chapter.`;

  return `You are an experienced ${spec.subject} teacher creating a Daily Practice Problem set for ${cls}students preparing for ${spec.exam}.

${focus}
Difficulty: ${diff} (${level})

Generate exactly ${spec.mcqCount} multiple-choice questions (4 options each, exactly one correct) and exactly ${spec.integerCount} integer-type questions (numerical answer, typically 0-999).

REQUIREMENTS:
- Questions must be ORIGINAL — do not copy from any book, coaching material, or past paper.
- Test genuine conceptual understanding, not just memorization.
- Each question must have a clear, step-by-step explanation (2-5 sentences).
- Use plain text math (e.g. "x^2 + 3x - 4 = 0", "v = u + at", "H2SO4"). No LaTeX.
- Integer answers must be non-negative integers.
- MCQ options should be plausible distractors, not obviously wrong.

Respond with ONLY valid JSON, no markdown fences. Schema:
{
  "questions": [
    { "type": "mcq", "question": "string", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "string", "marks": 4 },
    { "type": "integer", "question": "string", "answer": 42, "explanation": "string", "marks": 4 }
  ]
}`;
}

export async function generateDPP(spec: DPPSpec): Promise<DPPQuestion[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing. Get free at aistudio.google.com/apikey");

  const url = `${GEMINI_URL("gemini-1.5-flash-latest")}?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(spec) }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096, responseMimeType: "application/json" },
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned no text");

  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  let parsed: any;
  try { parsed = JSON.parse(cleaned); }
  catch { throw new Error("Response not valid JSON: " + cleaned.slice(0, 200)); }

  const qs = parsed.questions ?? parsed;
  if (!Array.isArray(qs)) throw new Error("Response missing questions array");

  const out: DPPQuestion[] = [];
  for (const q of qs) {
    if (q.type === "mcq" && Array.isArray(q.options) && q.options.length === 4
        && typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4) {
      out.push({
        type: "mcq",
        question: String(q.question),
        options: q.options.map(String),
        correctIndex: q.correctIndex,
        explanation: String(q.explanation ?? ""),
        marks: Number(q.marks ?? 4),
      });
    } else if (q.type === "integer" && typeof q.answer === "number") {
      out.push({
        type: "integer",
        question: String(q.question),
        answer: Math.floor(q.answer),
        explanation: String(q.explanation ?? ""),
        marks: Number(q.marks ?? 4),
      });
    }
  }
  if (out.length === 0) throw new Error("No valid questions in response");
  return out;
}
