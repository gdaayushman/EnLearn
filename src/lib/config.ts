/**
 * Central config: brand name + contact-to-buy details.
 */
export const BRAND = {
  name: "Ekagra",              // शop name shown everywhere
  tagline: "Focus. Learn. Excel.",
  logoInitials: "EK",          // shown in the header logo circle
};

export const CONTACT = {
  instagramHandle: "codmaayush",
  instagramUrl: "https://instagram.com/codmaayush",
  brandName: "Ekagra",         // used inside generated DPP PDFs
};

/** Build a pre-filled message the student can copy when they DM. */
export function buildDmMessage(opts: {
  batchName: string;
  publicId: string;
  amount?: number | string | null;
}) {
  const amt = opts.amount ? ` (₹${opts.amount})` : "";
  return `Hi! I want to buy "${opts.batchName}"${amt} on ${BRAND.name}. My User ID: ${opts.publicId}`;
}
