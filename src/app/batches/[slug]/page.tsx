import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import ContactToBuy from "@/components/ContactToBuy";

export const dynamic = "force-dynamic";

export default async function BatchDetailPage({ params }: { params: { slug: string } }) {
  const batch = await prisma.batch.findUnique({
    where: { slug: params.slug },
    include: {
      subCategory: { include: { category: true } },
      contents: { orderBy: { displayOrder: "asc" } },
      tests: true,
    },
  });
  if (!batch) notFound();

  const user = await currentUser();
  const enrolled = user
    ? await prisma.enrollment.findUnique({
        where: { userId_batchId: { userId: user.id, batchId: batch.id } },
      })
    : null;
  const pendingRequest = user
    ? await prisma.enrollmentRequest.findFirst({
        where: { userId: user.id, batchId: batch.id, status: "pending" },
      })
    : null;

  const displayPrice = batch.discountedPrice ?? batch.price;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <img src={batch.thumbnailUrl ?? ""} className="w-full rounded-2xl object-cover" alt={batch.name} />
        <div>
          <div className="text-sm text-slate-500">
            {batch.subCategory.category.name} · {batch.subCategory.name}
          </div>
          <h1 className="text-3xl font-bold">{batch.name}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{batch.description}</p>
        </div>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Course content</h2>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {batch.contents.map((c) => {
              const canOpen = enrolled || c.isPreview || batch.isFree;
              return (
                <li key={c.id.toString()} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm text-slate-500 uppercase">{c.contentType}</div>
                    <div className="font-medium">{c.title}</div>
                  </div>
                  {canOpen ? (
                    <Link href={`/learn/${batch.slug}/${c.id}`} className="btn-primary text-sm">Open</Link>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-500">🔒 Enroll to access</span>
                  )}
                </li>
              );
            })}
            {batch.contents.length === 0 && <li className="py-3 text-slate-500">No content yet.</li>}
          </ul>
        </section>

        {batch.tests.length > 0 && (
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">Tests</h2>
            <ul className="space-y-2">
              {batch.tests.map((t) => (
                <li key={t.id.toString()} className="flex items-center justify-between">
                  <span>{t.title}</span>
                  <Link href={`/tests/${t.id}`} className="btn-ghost text-sm">Take test</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="card h-fit p-5 space-y-4">
        <div>
          {batch.isFree ? (
            <div className="text-3xl font-bold text-emerald-600">FREE</div>
          ) : (
            <>
              <div className="text-3xl font-bold">{inr(displayPrice)}</div>
              {batch.discountedPrice && (
                <div className="text-slate-400 line-through">{inr(batch.price)}</div>
              )}
            </>
          )}
        </div>
        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <li>📅 Validity: {batch.validityMonths} months</li>
          <li>🎥 Type: {batch.batchType}</li>
          <li>🗣️ Language: {batch.language}</li>
          <li>👥 Enrolled: {batch.enrollmentCount}</li>
        </ul>

        {enrolled ? (
          <Link href={`/learn/${batch.slug}/${batch.contents[0]?.id ?? ""}`} className="btn-primary w-full">
            Continue learning
          </Link>
        ) : batch.isFree ? (
          <form action="/api/enrollments" method="post">
            <input type="hidden" name="batchId" value={batch.id.toString()} />
            <button className="btn-primary w-full">Enroll for free</button>
          </form>
        ) : (
          <ContactToBuy
            batchId={batch.id.toString()}
            batchName={batch.name}
            amount={Number(displayPrice)}
            user={user ? { publicId: user.publicId, name: user.name } : null}
            hasPendingRequest={!!pendingRequest}
          />
        )}
      </aside>
    </div>
  );
}
