/**
 * Central config for contact-to-buy flow.
 * Change these values or read from env if you want.
 */
export const CONTACT = {
  instagramHandle: "codmaayush",
  instagramUrl: "https://instagram.com/codmaayush",
  brandName: "codmaayush",
};

/** Build a pre-filled message the student can copy when they DM. */
export function buildDmMessage(opts: {
  batchName: string;
  publicId: string;
  amount?: number | string | null;
}) {
  const amt = opts.amount ? ` (₹${opts.amount})` : "";
  return `Hi! I want to buy "${opts.batchName}"${amt}. My User ID: ${opts.publicId}`;
}
