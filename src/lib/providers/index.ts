import { Resend } from "resend";
import { assertStripeEnvironment, configuredShippingCountries, configuredShippingRateIds } from "@/lib/payment-safety";

/**
 * PROVIDER SEAMS — real when env is present, honest stub when not.
 * Status is reported at call time, never faked.
 */

/* — Storage (product images/video) — REAL Vercel Blob when token is present — */
export interface StorageProvider {
  upload(file: { name: string; data: Uint8Array; contentType: string }): Promise<{ url: string }>;
  delete(url: string): Promise<void>;
}
export const storage: StorageProvider = {
  async upload({ name, data, contentType }) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Product media storage is not configured");
    const { put } = await import("@vercel/blob");
    const safeName = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const blob = await put(`products/${Date.now()}-${safeName}`, Buffer.from(data), {
      access: "public", contentType, addRandomSuffix: true,
    });
    return { url: blob.url };
  },
  async delete(url) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Product media storage is not configured");
    const { del } = await import("@vercel/blob");
    await del(url);
  },
};

/* — AI vision backend — the ONE thing that changes between providers is how a prompt +
   image/document gets sent and how the raw text answer comes back. OCR and resume-extraction
   business logic (prompts, JSON parsing, field normalization, review-before-save) never
   changes when the provider changes — only the functions in this block do. Selected via
   AI_EXTRACTION_PROVIDER ("anthropic" | "groq"), defaulting to "anthropic" for backward
   compatibility. Exactly one provider is called per request — never fan-out to multiple
   vendors with the same customer data. See docs/NETWORKING.md, docs/RESUME.md. */
export type AIExtractionProviderName = "anthropic" | "groq";

function currentProviderName(): AIExtractionProviderName {
  return (process.env.AI_EXTRACTION_PROVIDER || "").toLowerCase() === "groq" ? "groq" : "anthropic";
}

/** Which env var a provider still needs, if any — for operator-facing status display only (never a value, never stored in the DB). */
export function activeProviderStatus(): { provider: AIExtractionProviderName; configured: boolean; missingEnvVar: string | null } {
  const provider = currentProviderName();
  const missingEnvVar = provider === "groq"
    ? (process.env.GROQ_API_KEY ? null : "GROQ_API_KEY")
    : (process.env.ANTHROPIC_API_KEY ? null : "ANTHROPIC_API_KEY");
  return { provider, configured: !missingEnvVar, missingEnvVar };
}

class ProviderCredentialMissingError extends Error {}

interface VisionCompleteInput { kind: "ocr" | "resume"; prompt: string; media: { data: Uint8Array; contentType: string }; maxTokens: number }
interface VisionBackend { complete(input: VisionCompleteInput): Promise<{ text: string; model: string }> }

const anthropicBackend: VisionBackend = {
  async complete({ kind, prompt, media, maxTokens }) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new ProviderCredentialMissingError("ANTHROPIC_API_KEY");
    const model = (kind === "resume" ? process.env.ANTHROPIC_RESUME_MODEL : process.env.ANTHROPIC_OCR_MODEL)
      || process.env.ANTHROPIC_OCR_MODEL || "claude-sonnet-4-5-20250929";
    const base64 = Buffer.from(media.data).toString("base64");
    const isPdf = media.contentType === "application/pdf";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model, max_tokens: maxTokens,
        messages: [{
          role: "user",
          content: [
            isPdf
              ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
              : { type: "image", source: { type: "base64", media_type: media.contentType, data: base64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic provider error (${res.status})`);
    const json = await res.json() as { content?: Array<{ type: string; text?: string }> };
    return { text: json.content?.find((block) => block.type === "text")?.text ?? "", model };
  },
};

/** Groq's OpenAI-compatible API is image-only (no native PDF/document block) as of this
 * writing — verified against console.groq.com/docs/vision before wiring this in, per the
 * explicit instruction not to hardcode a model without checking. That page's exact current
 * model IDs could not be reliably confirmed through automated fetching (results were
 * inconsistent across repeated fetches), so GROQ_OCR_MODEL/GROQ_RESUME_MODEL are fully
 * env-overridable — confirm the live model id in the Groq console before real use and set
 * it there if the default below is stale. */
const GROQ_DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";

const groqBackend: VisionBackend = {
  async complete({ kind, prompt, media, maxTokens }) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new ProviderCredentialMissingError("GROQ_API_KEY");
    if (media.contentType === "application/pdf") {
      throw new Error("Groq does not support PDF documents for extraction — upload a JPG/PNG, or set AI_EXTRACTION_PROVIDER=anthropic for PDF resumes.");
    }
    const model = (kind === "resume" ? process.env.GROQ_RESUME_MODEL : process.env.GROQ_OCR_MODEL)
      || process.env.GROQ_OCR_MODEL || GROQ_DEFAULT_VISION_MODEL;
    const base64 = Buffer.from(media.data).toString("base64");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${media.contentType};base64,${base64}` } },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Groq provider error (${res.status})`);
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return { text: json.choices?.[0]?.message?.content ?? "", model };
  },
};

function resolveBackend(): VisionBackend {
  return currentProviderName() === "groq" ? groqBackend : anthropicBackend;
}

/* — OCR (business card scanning) — provider-agnostic; see the vision-backend block above
   for which vendor actually gets called. Structured output is requested as strict JSON;
   card image bytes are never persisted — they exist only for the duration of this call.
   See docs/NETWORKING.md. */
export interface BusinessCardCandidate {
  firstName?: string; lastName?: string; fullName?: string;
  jobTitle?: string; company?: string;
  email?: string; phone?: string; mobilePhone?: string; website?: string;
  addressLine?: string; city?: string; region?: string; postalCode?: string; country?: string;
  linkedinUrl?: string; otherUrls?: string[];
}
export interface OCRProvider {
  extractBusinessCard(input: { data: Uint8Array; contentType: string }): Promise<{ candidate: BusinessCardCandidate; rawText: string }>;
}
/** Thrown when no OCR credential is configured — callers show "try again later / enter manually", never a crash. */
export class OCRProviderUnavailableError extends Error {}

const CARD_FIELDS = [
  "firstName", "lastName", "fullName", "jobTitle", "company", "email", "phone", "mobilePhone",
  "website", "addressLine", "city", "region", "postalCode", "country", "linkedinUrl", "otherUrls",
] as const;

function extractionPrompt() {
  return `You are reading a photo of a business card. Extract only information that is actually visible on the card — never invent or guess a value that isn't there.

Respond with ONLY a single JSON object (no markdown fences, no explanation) with exactly these keys: ${CARD_FIELDS.join(", ")}.
- Use null for any field you cannot find.
- "otherUrls" is an array of strings (social/profile URLs other than LinkedIn), or an empty array.
- All other fields are strings or null.
- Do not include any keys other than the ones listed.`;
}

function parseJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in OCR response");
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeCandidate(raw: unknown): BusinessCardCandidate {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const urls = Array.isArray(obj.otherUrls) ? obj.otherUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0) : undefined;
  return {
    firstName: str(obj.firstName), lastName: str(obj.lastName), fullName: str(obj.fullName),
    jobTitle: str(obj.jobTitle), company: str(obj.company),
    email: str(obj.email), phone: str(obj.phone), mobilePhone: str(obj.mobilePhone), website: str(obj.website),
    addressLine: str(obj.addressLine), city: str(obj.city), region: str(obj.region),
    postalCode: str(obj.postalCode), country: str(obj.country),
    linkedinUrl: str(obj.linkedinUrl), otherUrls: urls,
  };
}

export const ocr: OCRProvider = {
  async extractBusinessCard({ data, contentType }) {
    let text: string;
    try {
      const result = await resolveBackend().complete({ kind: "ocr", prompt: extractionPrompt(), media: { data, contentType }, maxTokens: 1024 });
      text = result.text;
    } catch (e) {
      if (e instanceof ProviderCredentialMissingError) throw new OCRProviderUnavailableError(`Business card scanning is not configured — set ${e.message} to enable it.`);
      throw e;
    }
    let parsed: unknown;
    try { parsed = parseJsonBlock(text); } catch { throw new Error("Could not read that card — try again or enter it manually"); }
    return { candidate: normalizeCandidate(parsed), rawText: text };
  },
};

/* — Resume extraction (Phase 3) — a DIFFERENT task from business-card OCR (a whole document,
   not a single small card), so it gets its own interface rather than being shoehorned into
   OCRProvider — but shares the same vision-backend abstraction, provider selection, and
   parseJsonBlock() JSON-extraction helper. Extraction is always a candidate: the owner
   reviews and can edit every field before anything saves. Note: Groq's backend rejects PDF
   input (see groqBackend above) — a PDF resume under AI_EXTRACTION_PROVIDER=groq surfaces as
   a normal extraction_failed error, same as any other provider failure; no special-casing
   needed at the call site. */
export interface StructuredExperience { company?: string; title?: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description?: string }
export interface StructuredEducation { institution?: string; degree?: string; fieldOfStudy?: string; location?: string; startDate?: string; endDate?: string; description?: string }
export interface StructuredSkill { name?: string; category?: string }
export interface StructuredCertification { name?: string; issuer?: string; issueDate?: string; expirationDate?: string; credentialId?: string; credentialUrl?: string }
export interface StructuredLanguage { language?: string; proficiency?: string }
export interface StructuredProject { name?: string; role?: string; description?: string; url?: string; startDate?: string; endDate?: string }
export interface StructuredResumeExtraction {
  name?: string; headline?: string; summary?: string;
  email?: string; phone?: string; location?: string; website?: string;
  experience: StructuredExperience[]; education: StructuredEducation[]; skills: StructuredSkill[];
  certifications: StructuredCertification[]; languages: StructuredLanguage[]; projects: StructuredProject[];
}
export interface ResumeExtractionProvider {
  extractResume(input: { data: Uint8Array; contentType: string }): Promise<{ extraction: StructuredResumeExtraction; rawText: string; provider: AIExtractionProviderName; model: string }>;
}
export class ResumeExtractionUnavailableError extends Error {}

function resumeExtractionPrompt() {
  return `You are reading a resume/CV document. It may belong to any profession — office work, trades, hospitality, creative, athletic, freelance, etc. Extract only information actually present in the document — never invent or guess a value.

Respond with ONLY a single JSON object (no markdown fences, no explanation) shaped exactly like this:
{
  "name": string|null, "headline": string|null, "summary": string|null,
  "email": string|null, "phone": string|null, "location": string|null, "website": string|null,
  "experience": [{"company": string|null, "title": string|null, "location": string|null, "startDate": string|null, "endDate": string|null, "current": boolean, "description": string|null}],
  "education": [{"institution": string|null, "degree": string|null, "fieldOfStudy": string|null, "location": string|null, "startDate": string|null, "endDate": string|null, "description": string|null}],
  "skills": [{"name": string|null, "category": string|null}],
  "certifications": [{"name": string|null, "issuer": string|null, "issueDate": string|null, "expirationDate": string|null, "credentialId": string|null, "credentialUrl": string|null}],
  "languages": [{"language": string|null, "proficiency": string|null}],
  "projects": [{"name": string|null, "role": string|null, "description": string|null, "url": string|null, "startDate": string|null, "endDate": string|null}]
}
- Dates may be approximate/partial as written on the document (e.g. "2019", "Jun 2021", "Present") — copy them as text, don't reformat.
- Arrays are [] when nothing is found, never omitted.
- Do not include any keys other than the ones shown.`;
}

function normalizeStringArray<T>(raw: unknown, keys: (keyof T & string)[]): T[] {
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of keys) out[key] = key === "current" ? row.current === true : str(row[key]);
    return [out as T];
  });
}

function normalizeExtraction(raw: unknown): StructuredResumeExtraction {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    name: str(obj.name), headline: str(obj.headline), summary: str(obj.summary),
    email: str(obj.email), phone: str(obj.phone), location: str(obj.location), website: str(obj.website),
    experience: normalizeStringArray<StructuredExperience>(obj.experience, ["company", "title", "location", "startDate", "endDate", "current", "description"]),
    education: normalizeStringArray<StructuredEducation>(obj.education, ["institution", "degree", "fieldOfStudy", "location", "startDate", "endDate", "description"]),
    skills: normalizeStringArray<StructuredSkill>(obj.skills, ["name", "category"]),
    certifications: normalizeStringArray<StructuredCertification>(obj.certifications, ["name", "issuer", "issueDate", "expirationDate", "credentialId", "credentialUrl"]),
    languages: normalizeStringArray<StructuredLanguage>(obj.languages, ["language", "proficiency"]),
    projects: normalizeStringArray<StructuredProject>(obj.projects, ["name", "role", "description", "url", "startDate", "endDate"]),
  };
}

export const resumeExtraction: ResumeExtractionProvider = {
  async extractResume({ data, contentType }) {
    let text: string; let model: string;
    try {
      const result = await resolveBackend().complete({ kind: "resume", prompt: resumeExtractionPrompt(), media: { data, contentType }, maxTokens: 4096 });
      text = result.text; model = result.model;
    } catch (e) {
      if (e instanceof ProviderCredentialMissingError) throw new ResumeExtractionUnavailableError(`Resume extraction is not configured — set ${e.message} to enable it.`);
      throw e;
    }
    let parsed: unknown;
    try { parsed = parseJsonBlock(text); } catch { throw new Error("Could not read that resume — try again or build it manually"); }
    return { extraction: normalizeExtraction(parsed), rawText: text, provider: currentProviderName(), model };
  },
};

/* — Payments — REAL Stripe when STRIPE_SECRET_KEY present — */
export interface PaymentProvider {
  createCheckout(input: {
    orderId: string; email: string;
    lineItems: { name: string; amount: number; quantity: number }[];
    successUrl: string; cancelUrl: string;
  }): Promise<{ url: string; sessionId: string | null; simulated: boolean }>;
  refund(input: { orderId: string; paymentIntentId: string }): Promise<{ refundId: string }>;
  expireCheckout(sessionId: string): Promise<void>;
}
export const payments: PaymentProvider = {
  async createCheckout({ orderId, email, lineItems, successUrl, cancelUrl }) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      // STUBBED: no key → simulated success so the flow is testable pre-wire.
      return { url: `${successUrl}?order=${orderId}&simulated=1`, sessionId: null, simulated: true };
    }
    assertStripeEnvironment(key, { vercelEnv: process.env.VERCEL_ENV, configuredMode: process.env.STRIPE_MODE });
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key);
    const shippingRateIds = configuredShippingRateIds(process.env.STRIPE_SHIPPING_RATE_IDS);
    const allowedCountries = configuredShippingCountries(process.env.STRIPE_SHIPPING_COUNTRIES);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: orderId,
      customer_email: email,
      line_items: lineItems.map((li) => ({
        quantity: li.quantity,
        price_data: {
          currency: "usd",
          product_data: { name: li.name },
          unit_amount: li.amount, // cents
        },
      })),
      success_url: `${successUrl}?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { orderId },
      payment_intent_data: { metadata: { orderId } },
      shipping_address_collection: {
        allowed_countries: allowedCountries as import("stripe").Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      ...(shippingRateIds.length > 0 ? {
        shipping_options: shippingRateIds.map((shipping_rate) => ({ shipping_rate })),
      } : {}),
    }, { idempotencyKey: `solo-checkout-${orderId}` });
    return { url: session.url ?? successUrl, sessionId: session.id, simulated: false };
  },
  async refund({ orderId, paymentIntentId }) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Stripe is not configured");
    assertStripeEnvironment(key, { vercelEnv: process.env.VERCEL_ENV, configuredMode: process.env.STRIPE_MODE });
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key);
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId, metadata: { orderId } }, { idempotencyKey: `solo-refund-${orderId}` });
    if (refund.status !== "succeeded" && refund.status !== "pending") throw new Error("Stripe did not accept the refund");
    return { refundId: refund.id };
  },
  async expireCheckout(sessionId) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return;
    assertStripeEnvironment(key, { vercelEnv: process.env.VERCEL_ENV, configuredMode: process.env.STRIPE_MODE });
    const Stripe = (await import("stripe")).default;
    await new Stripe(key).checkout.sessions.expire(sessionId);
  },
};

/* — Notifications — REAL Resend when RESEND_API_KEY present — */
export interface NotificationProvider {
  operatorNewOrder(o: { orderNumber: string; email: string; total: number }): Promise<void>;
  customerOrderConfirmation(o: { orderNumber: string; email: string; total: number }): Promise<void>;
  customerShipped(o: { orderNumber: string; email: string; tracking?: string }): Promise<void>;
  operatorAlert(o: { subject: string; message: string }): Promise<void>;
}

const resendKey = process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY;
const from = process.env.EMAIL_FROM ?? "SnapLink <onboarding@resend.dev>";
const operatorEmail = process.env.OPERATOR_EMAIL;
const resend = resendKey ? new Resend(resendKey) : null;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
async function sendEmail(input: { to: string; subject: string; text: string }) {
  if (!resend) throw new Error("Email provider is not configured");
  const result = await resend.emails.send({ from, ...input });
  if (result.error) throw new Error(`Email delivery failed: ${result.error.name}`);
}

export const notifications: NotificationProvider = {
  async operatorNewOrder(o) {
    if (resend && operatorEmail) {
      await sendEmail({ to: operatorEmail, subject: `New paid order ${o.orderNumber}`,
        text: `New paid order ${o.orderNumber} from ${o.email} — ${money(o.total)}.` });
    } else if (process.env.NODE_ENV === "production") throw new Error("Operator email is not configured");
    else { console.log(`[notify STUB] operator: new order ${o.orderNumber}`); }
  },
  async customerOrderConfirmation(o) {
    if (resend) {
      await sendEmail({ to: o.email, subject: `Your SnapLink order ${o.orderNumber}`,
        text: `Thanks for your order ${o.orderNumber} (${money(o.total)}). We'll prepare your SnapLink and email activation instructions when it ships.` });
    } else if (process.env.NODE_ENV === "production") throw new Error("Customer email is not configured");
    else { console.log(`[notify STUB] customer confirmation ${o.orderNumber}`); }
  },
  async customerShipped(o) {
    if (resend) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      const steps = [
        "1. Sign in to SnapLink.",
        "2. Open My Hardware and choose Activate.",
        "3. Or tap your SnapLink to begin activation.",
      ].join("\n");
      const link = appUrl ? `\n\n${appUrl}/app/hardware` : "";
      await sendEmail({ to: o.email, subject: `Your SnapLink shipped — ${o.orderNumber}`,
        text: `Your order ${o.orderNumber} has shipped.${o.tracking ? ` Tracking: ${o.tracking}.` : ""}\n\nYour SnapLink is on the way. When it arrives:\n${steps}${link}` });
    } else if (process.env.NODE_ENV === "production") throw new Error("Customer email is not configured");
    else { console.log(`[notify STUB] customer shipped ${o.orderNumber}`); }
  },
  async operatorAlert(o) {
    if (!operatorEmail) throw new Error("Operator alert email is not configured");
    await sendEmail({ to: operatorEmail, subject: o.subject, text: o.message });
  },
};
