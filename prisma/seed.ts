/**
 * Seeds the full category → sub-category tree from the master prompt,
 * plus a few sample batches, and the real admin user.
 *
 * Run: npm run db:seed
 */
import { PrismaClient, Role, BatchType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const tree: Array<{
  name: string;
  isPaid: boolean;
  subs: Array<{ name: string; tags?: string[] }>;
}> = [
  {
    name: "My Launched Batches",
    isPaid: true,
    subs: [
      { name: "Regular Batches", tags: ["Class 11", "Class 12", "Dropper", "JEE", "NEET"] },
      { name: "Power Batch",     tags: ["personalized", "1:1"] },
      { name: "Lakshya Batch",   tags: ["live", "DPP"] },
      { name: "Special Batches", tags: ["weekend", "morning", "evening", "crash"] },
    ],
  },
  {
    name: "Free Materials",
    isPaid: false,
    subs: [
      { name: "Revision Batches",     tags: ["revision"] },
      { name: "One Shot Lectures",    tags: ["one-shot"] },
      { name: "Free Demo Batches",    tags: ["demo"] },
      { name: "PYQ Batches",          tags: ["pyq"] },
      { name: "Crash Courses",        tags: ["crash"] },
      { name: "DPP Batches",          tags: ["dpp"] },
      { name: "Test Series Batches",  tags: ["tests"] },
      { name: "Special Free Batches", tags: ["scholarship", "foundation"] },
    ],
  },
];

const sampleBatches: Record<string, Array<{ name: string; price?: number; isFree?: boolean; language?: string; type?: BatchType }>> = {
  "regular-batches": [
    { name: "Class 11 JEE Arjuna 2026",  price: 5999,  type: "hybrid" },
    { name: "Class 12 NEET Yakeen 2026", price: 6999,  type: "hybrid" },
    { name: "Dropper JEE Lakshya 2026",  price: 8999,  type: "live" },
  ],
  "power-batch":     [{ name: "Power Batch JEE 2026", price: 24999, type: "live" }],
  "lakshya-batch":   [{ name: "Lakshya NEET 2026",    price: 12999, type: "live" }],
  "special-batches": [{ name: "Weekend JEE Booster",  price: 2999,  type: "recorded" }],

  "revision-batches":     [
    { name: "Revision Batch — Class 11", isFree: true },
    { name: "NEET Revision Sprint",      isFree: true },
  ],
  "one-shot-lectures":    [
    { name: "One Shot — Class 12 (Full Syllabus)", isFree: true },
    { name: "One Shot — JEE Main",                 isFree: true },
  ],
  "free-demo-batches":    [{ name: "Free Demo — Physics Class 11", isFree: true }],
  "pyq-batches":          [{ name: "PYQ — JEE Main (2020-2025)",   isFree: true }],
  "crash-courses":        [{ name: "30-Day Crash — JEE",           isFree: true }],
  "dpp-batches":          [{ name: "DPP Batch — Physics Class 11", isFree: true }],
  "test-series-batches":  [{ name: "Mock Test Batch — JEE",        isFree: true }],
  "special-free-batches": [{ name: "Scholarship Test Batch",       isFree: true }],
};

async function main() {
  console.log("🌱 Seeding categories & sub-categories…");

  for (const [ci, cat] of tree.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: slug(cat.name) },
      update: {},
      create: {
        name: cat.name,
        slug: slug(cat.name),
        description: `${cat.name} category`,
        isPaid: cat.isPaid,
        displayOrder: ci,
      },
    });

    for (const [si, sub] of cat.subs.entries()) {
      const subCategory = await prisma.subCategory.upsert({
        where: { slug: slug(sub.name) },
        update: {},
        create: {
          name: sub.name,
          slug: slug(sub.name),
          categoryId: category.id,
          displayOrder: si,
          tags: sub.tags ?? [],
        },
      });

      const batches = sampleBatches[slug(sub.name)] ?? [];
      for (const [bi, b] of batches.entries()) {
        const batchSlug = slug(b.name);
        const existing = await prisma.batch.findUnique({ where: { slug: batchSlug } });
        if (existing) continue;

        const batch = await prisma.batch.create({
          data: {
            subCategoryId: subCategory.id,
            name: b.name,
            slug: batchSlug,
            batchCode: `EK-${batchSlug.toUpperCase().slice(0, 20)}-${bi}`,
            description: `${b.name} — comprehensive coverage with live classes, notes, DPPs, tests.`,
            batchType: b.type ?? "recorded",
            price: b.price ?? 0,
            discountedPrice: b.price ? Math.round(b.price * 0.7) : null,
            validityMonths: 12,
            language: b.language ?? "Hinglish",
            thumbnailUrl: `https://picsum.photos/seed/${batchSlug}/640/360`,
            isFree: !!b.isFree,
            startsFrom: new Date(),
          },
        });

        await prisma.batchContent.createMany({
          data: [
            {
              batchId: batch.id,
              contentType: "video",
              title: `${b.name} — Orientation`,
              description: "Welcome & how to use this batch",
              embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              durationMinutes: 12,
              displayOrder: 0,
              isPreview: true,
            },
            {
              batchId: batch.id,
              contentType: "pdf",
              title: "Batch Handbook (PDF)",
              fileUrl: "https://www.orimi.com/pdf-test.pdf",
              displayOrder: 1,
              isPreview: true,
            },
          ],
        });
      }
    }
  }

  console.log("📚 Seeding subjects & chapters…");
  const subjects = ["Physics", "Chemistry", "Mathematics", "Biology"];
  for (const [si, name] of subjects.entries()) {
    const subj = await prisma.subject.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), displayOrder: si },
    });
    const chapters = ["Kinematics", "Laws of Motion", "Work Energy Power"];
    for (const [ci, cname] of chapters.entries()) {
      await prisma.chapter.upsert({
        where: { subjectId_slug: { subjectId: subj.id, slug: slug(cname) } },
        update: {},
        create: { subjectId: subj.id, name: cname, slug: slug(cname), displayOrder: ci },
      });
    }
  }

  // ─── REAL ADMIN ACCOUNT ─────────────────────────────────
  console.log("👤 Seeding your admin account…");
  const adminEmail = process.env.ADMIN_EMAIL || "toolsaayushman@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Aayushman@2009";
  const hashed = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashed, role: Role.admin, isActive: true },
    create: {
      name: "Aayushman",
      email: adminEmail,
      password: hashed,
      role: Role.admin,
    },
  });
  console.log(`   ✓ Admin: ${adminEmail}`);

  // Add a sample test to the first free batch
  console.log("📝 Seeding a sample test…");
  const sampleBatch = await prisma.batch.findFirst({ where: { isFree: true } });
  if (sampleBatch) {
    const existing = await prisma.test.findFirst({ where: { batchId: sampleBatch.id } });
    if (!existing) {
      await prisma.test.create({
        data: {
          batchId: sampleBatch.id,
          title: "Sample Quiz — Physics Basics",
          description: "3 easy MCQs to try the test flow.",
          testType: "topic",
          durationMinutes: 5,
          totalMarks: 3,
          totalQuestions: 3,
          questions: {
            create: [
              {
                questionText: "What is the SI unit of force?", marks: 1, displayOrder: 0,
                options: { create: [
                  { optionText: "Newton",   isCorrect: true,  displayOrder: 0 },
                  { optionText: "Joule",    isCorrect: false, displayOrder: 1 },
                  { optionText: "Pascal",   isCorrect: false, displayOrder: 2 },
                  { optionText: "Watt",     isCorrect: false, displayOrder: 3 },
                ]},
              },
              {
                questionText: "Acceleration due to gravity on Earth (approx.)?", marks: 1, displayOrder: 1,
                options: { create: [
                  { optionText: "9.8 m/s²", isCorrect: true,  displayOrder: 0 },
                  { optionText: "5.0 m/s²", isCorrect: false, displayOrder: 1 },
                  { optionText: "15 m/s²",  isCorrect: false, displayOrder: 2 },
                  { optionText: "1.6 m/s²", isCorrect: false, displayOrder: 3 },
                ]},
              },
              {
                questionText: "Speed of light in vacuum?", marks: 1, displayOrder: 2,
                options: { create: [
                  { optionText: "3 × 10⁸ m/s", isCorrect: true,  displayOrder: 0 },
                  { optionText: "3 × 10⁶ m/s", isCorrect: false, displayOrder: 1 },
                  { optionText: "3 × 10¹⁰ m/s", isCorrect: false, displayOrder: 2 },
                  { optionText: "3 × 10⁴ m/s", isCorrect: false, displayOrder: 3 },
                ]},
              },
            ],
          },
        },
      });
    }
  }

  console.log("✅ Seed complete.");
  console.log(`   Login at your site with: ${adminEmail}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); })
