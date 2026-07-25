import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import DPPViewer from "@/components/DPPViewer";

export const dynamic = "force-dynamic";

export default async function LearnPage({ params }: { params: { batchSlug: string; contentId: string } }) {
  const batch = await prisma.batch.findUnique({
    where: { slug: params.batchSlug },
    include: { contents: { orderBy: { displayOrder: "asc" } } },
  });
  if (!batch) notFound();

  const user = await currentUser();
  const enrolled = user
    ? await prisma.enrollment.findUnique({
        where: { userId_batchId: { userId: user.id, batchId: batch.id } },
      })
    : null;

  // Handle daily-DPP URLs of the form /learn/[batchSlug]/dpp-<day>
  const dppMatch = params.contentId.match(/^dpp-(\d+)$/);
  if (dppMatch) {
    if (!enrolled && !batch.isFree) {
      return (
        <div className="card p-8 text-center">
          <p>🔒 Enroll to access Daily DPPs.</p>
          <Link href={`/batches/${batch.slug}`} className="btn-primary mt-4 inline-flex">Back to batch</Link>
        </div>
      );
    }
    return <DPPViewer batchId={batch.id.toString()} batchSlug={batch.slug} day={Number(dppMatch[1])} />;
  }

  const content = batch.contents.find((c) => c.id.toString() === params.contentId);
  if (!content) notFound();

  if (!enrolled && !content.isPreview && !batch.isFree) {
    return (
      <div className="card p-8 text-center">
        <p>🔒 This content is locked. Please enroll to access.</p>
        <Link href={`/batches/${batch.slug}`} className="btn-primary mt-4 inline-flex">Back to batch</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <aside className="card p-3 lg:col-span-1 max-h-[80vh] overflow-auto">
        <div className="mb-2 text-sm font-semibold text-slate-500">{batch.name}</div>
        <ul className="space-y-1 text-sm">
          {batch.contents.map((c) => (
            <li key={c.id.toString()}>
              <Link
                href={`/learn/${batch.slug}/${c.id}`}
                className={`block rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  c.id === content.id ? "bg-brand-50 dark:bg-brand-900/30 font-medium" : ""
                }`}
              >
                <span className="mr-2 text-xs uppercase text-slate-400">{c.contentType}</span>
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <section className="lg:col-span-3 space-y-4">
        <h1 className="text-xl font-semibold">{content.title}</h1>
        {content.contentType === "video" && content.embedUrl && (
          <div className="aspect-video overflow-hidden rounded-2xl">
            <iframe src={content.embedUrl} className="h-full w-full"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        )}
        {content.contentType === "video" && !content.embedUrl && content.fileUrl && (
          <video src={content.fileUrl} controls controlsList="nodownload" className="aspect-video w-full rounded-2xl bg-black" />
        )}
        {(content.contentType === "pdf" || content.contentType === "dpp") && content.fileUrl && (
          <iframe src={content.fileUrl} className="h-[80vh] w-full rounded-2xl border" />
        )}
        {content.contentType === "link" && content.fileUrl && (
          <a href={content.fileUrl} target="_blank" className="btn-primary">Open link</a>
        )}
        {content.description && <p className="text-slate-600 dark:text-slate-300">{content.description}</p>}
      </section>
    </div>
  );
}
