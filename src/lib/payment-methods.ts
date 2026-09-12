import { z } from "zod";
import type { StoredPaymentMethod } from "@/lib/profile-data";
import { getDict, type Locale } from "@/i18n/dict";

export const PAYMENT_TYPES = ["venmo", "cashapp", "paypal", "zelle", "custom"] as const;
export const paymentMethodSchema = z.object({
  type: z.enum(PAYMENT_TYPES), value: z.string().trim().min(1).max(500),
  label: z.string().trim().max(40).optional(), enabled: z.boolean(), public: z.boolean(),
  sortOrder: z.number().int().min(0).max(20),
});

function safeHttp(raw: string) {
  try { const url = new URL(raw.trim()); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}
function handle(raw: string, allowDollar = false) {
  const cleaned = raw.trim().replace(/^@/, "").replace(allowDollar ? /^\$/ : /$^/, "");
  return /^[A-Za-z0-9._-]{1,80}$/.test(cleaned) ? cleaned : null;
}

export type PublicPaymentMethod = StoredPaymentMethod & { href: string | null; copyValue: string | null; displayLabel: string };
export function normalizePaymentMethod(method: StoredPaymentMethod, locale: Locale = "en"): PublicPaymentMethod | null {
  let href: string | null = null; let copyValue: string | null = null;
  if (method.type === "venmo") { const value = handle(method.value); href = value ? `https://venmo.com/u/${encodeURIComponent(value)}` : null; }
  if (method.type === "cashapp") { const value = handle(method.value, true); href = value ? `https://cash.app/$${encodeURIComponent(value)}` : null; }
  if (method.type === "paypal") { const value = handle(method.value); href = value ? `https://paypal.me/${encodeURIComponent(value)}` : null; }
  if (method.type === "zelle") copyValue = method.value.trim();
  if (method.type === "custom") href = safeHttp(method.value);
  if (!href && !copyValue) return null;
  const displayLabel = method.label || ({ venmo: "Venmo", cashapp: "Cash App", paypal: "PayPal", zelle: "Zelle", custom: getDict(locale).contact.payFallback } as const)[method.type];
  return { ...method, href, copyValue, displayLabel };
}

export function publicPaymentMethods(methods: StoredPaymentMethod[], locale: Locale = "en") {
  return methods.filter((method) => method.enabled && method.public).sort((a, b) => a.sortOrder - b.sortOrder).flatMap((method) => {
    const normalized = normalizePaymentMethod(method, locale); return normalized ? [normalized] : [];
  });
}
