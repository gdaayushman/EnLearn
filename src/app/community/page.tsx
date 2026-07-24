"use client";
import { useEffect, useState } from "react";

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"doubt" | "discussion" | "announcement">("doubt");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  const load = () => fetch("/api/community/posts").then((r) => r.json()).then(setPosts);
  useEffect(() => { load(); }, []);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const res = await fetch("/api/community/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, postType }),
    });
    if (res.ok) { setContent(""); load(); }
    else setErr("Please login first.");
  }

  async function submitReply(postId: string) {
    const text = (replyDrafts[postId] ?? "").trim();
    if (!text) return;
    const res = await fetch("/api/community/replies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, content: text }),
    });
    if (res.ok) { setReplyDrafts({ ...replyDrafts, [postId]: "" }); load(); }
    else alert("Login required");
  }

  async function upvote(kind: "post" | "reply", id: string) {
    const res = await fetch("/api/community/upvote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id }),
    });
    if (res.ok) load();
    else alert("Login required");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Community</h1>
      <form onSubmit={submitPost} className="card p-4 space-y-2">
        <select value={postType} onChange={(e) => setPostType(e.target.value as any)} className="input">
          <option value="doubt">Doubt</option>
          <option value="discussion">Discussion</option>
          <option value="announcement">Announcement</option>
        </select>
        <textarea className="input" rows={3} placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} required />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary">Post</button>
      </form>

      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="card p-4 space-y-2">
            <div className="mb-1 text-xs text-slate-500">
              {p.user?.name} · {new Date(p.createdAt).toLocaleString()} · <span className="uppercase">{p.postType}</span>
            </div>
            <p className="whitespace-pre-wrap">{p.content}</p>
            <div className="flex items-center gap-3 text-xs">
              <button onClick={() => upvote("post", p.id)} className="btn-ghost">👍 {p.upvotes}</button>
              <button
                onClick={() => setOpenReplies({ ...openReplies, [p.id]: !openReplies[p.id] })}
                className="btn-ghost"
              >
                💬 {p.replies?.length ?? 0} replies
              </button>
              {p.isAnswered && <span className="badge bg-emerald-100 text-emerald-700">Answered</span>}
            </div>

            {openReplies[p.id] && (
              <div className="ml-4 mt-2 space-y-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                {p.replies?.map((r: any) => (
                  <div key={r.id} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                    <div className="text-xs text-slate-500">{r.user?.name ?? "User"} · {new Date(r.createdAt).toLocaleString()}</div>
                    <p className="whitespace-pre-wrap text-sm">{r.content}</p>
                    <button onClick={() => upvote("reply", r.id)} className="btn-ghost mt-1 text-xs">👍 {r.upvotes}</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Write a reply…"
                    value={replyDrafts[p.id] ?? ""}
                    onChange={(e) => setReplyDrafts({ ...replyDrafts, [p.id]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") submitReply(p.id); }}
                  />
                  <button onClick={() => submitReply(p.id)} className="btn-primary text-sm">Reply</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {posts.length === 0 && <p className="text-center text-slate-500">Be the first to post!</p>}
      </div>
    </div>
  );
}
