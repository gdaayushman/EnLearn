/**
 * AI-generates a full curriculum outline for a batch:
 * subjects → chapters → ordered topics.
 *
 * This is generated once per batch (and cached in BatchCurriculum table),
 * then drives the "Day N = Topic N" daily-DPP progression.
 */

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export type Topic = string;
export type Chapter = { name: string; topics: Topic[] };
export type Subject = { name: string; chapters: Chapter[] };
export type Curriculum = { subjects: Subject[] };

/** How many total topics does a curriculum have? (drives max Day number) */
export function totalTopics(c: Curriculum): number {
  return c.subjects.reduce((s, subj) => s + subj.chapters.reduce((t, ch) => t + ch.topics.length, 0), 0);
}

/** Given curriculum and a Day number, return which subject/chapter/topic that day maps to. */
export function topicForDay(c: Curriculum, day: number): { subject: string; chapter: string; topic: string } | null {
  let counter = 0;
  for (const subj of c.subjects) {
    for (const ch of subj.chapters) {
      for (const topic of ch.topics) {
        counter++;
        if (counter === day) return { subject: subj.name, chapter: ch.name, topic };
      }
    }
  }
  return null;
}

function buildCurriculumPrompt(opts: {
  exam: string; cls?: string; subjects: string[];
}): string {
  const cls = opts.cls ? `Class ${opts.cls} ` : "";
  return `You are a curriculum designer for ${opts.exam} preparation.

Create a complete, ordered curriculum outline for ${cls}students preparing for ${opts.exam}, covering these subjects: ${opts.subjects.join(", ")}.

For EACH subject:
- List 8-12 major chapters in the standard teaching order (foundational → advanced)
- For EACH chapter, list 5-10 specific TOPICS in the order they are typically taught
- Topics should be specific enough to be a single day's focused practice (e.g. "Relative velocity in 1D" rather than just "Motion")

Respond with ONLY valid JSON, no markdown fences. Schema:
{
  "subjects": [
    {
      "name": "Physics",
      "chapters": [
        {
          "name": "Kinematics",
          "topics": ["Introduction and frames of reference", "Displacement and distance", "Uniform velocity", "Uniform acceleration", "Motion under gravity", "Relative velocity in 1D", "Projectile motion basics", "Projectile motion advanced"]
        }
      ]
    }
  ]
}

Aim for approximately 200-300 total topics across all subjects (this becomes the batch's ~200-300 day daily-practice program).`;
}

export async function generateCurriculum(opts: {
  exam: string; cls?: string; subjects: string[];
}): Promise<Curriculum> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing. Get free at aistudio.google.com/apikey");

  const url = `${GEMINI_URL("gemini-1.5-flash-latest")}?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildCurriculumPrompt(opts) }] }],
      generationConfig: {
        temperature: 0.4,        // lower = more predictable curriculum
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: any;
  try { parsed = JSON.parse(cleaned); }
  catch { throw new Error("Curriculum JSON parse failed: " + cleaned.slice(0, 200)); }

  if (!Array.isArray(parsed.subjects)) throw new Error("Missing subjects array");

  // Normalize
  const curriculum: Curriculum = {
    subjects: parsed.subjects.map((s: any) => ({
      name: String(s.name),
      chapters: (s.chapters ?? []).map((c: any) => ({
        name: String(c.name),
        topics: (c.topics ?? []).map((t: any) => String(t)).filter(Boolean),
      })).filter((c: Chapter) => c.topics.length > 0),
    })).filter((s: Subject) => s.chapters.length > 0),
  };

  if (totalTopics(curriculum) === 0) throw new Error("Curriculum has no topics");
  return curriculum;
}
