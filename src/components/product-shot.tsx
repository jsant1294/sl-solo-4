import type { Product } from "@/db/schema";

/**
 * ProductShot — renders a product's primary image when present, else a
 * premium CSS placeholder. Real photography drops in via product.primaryImageId
 * (resolved to a media URL) — NEVER hardcode imagery in pages. When the media
 * contract is wired, pass `imageUrl`.
 */
export function ProductShot({
  productType, color, imageUrl, alt, className = "",
}: { productType: string; color?: string; imageUrl?: string | null; alt?: string; className?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={alt ?? ""} className={`object-cover w-full h-full ${className}`} />;
  }
  return (
    <div className={`relative w-full h-full grid place-items-center overflow-hidden ${className}`}
      style={{ background: "linear-gradient(160deg, hsl(40 20% 94%), hsl(42 33% 97%))" }}>
      <div className="absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(80% 60% at 70% 20%, hsl(var(--gold) / 0.12), transparent 60%)" }} />
      <Shape productType={productType} color={color} />
    </div>
  );
}

function Shape({ productType, color }: { productType: string; color?: string }) {
  const c = color ?? "#14120F";
  const box = "shadow-lg";
  switch (productType) {
    case "card":
      return <div className={`w-40 h-24 rounded-xl ${box}`} style={{ background: c, transform: "rotate(-6deg)" }} />;
    case "phone_plate":
      return <div className={`w-24 h-40 rounded-2xl ${box}`} style={{ background: c, transform: "rotate(-6deg)" }} />;
    case "bracelet":
      return <div className={`w-36 h-36 rounded-full ${box}`} style={{ border: `14px solid ${c}` }} />;
    case "keychain":
      return <div className={`w-16 h-32 rounded-full ${box}`} style={{ background: c }} />;
    case "stand":
      return <div className={`w-36 h-28 rounded-t-2xl ${box}`} style={{ background: c, borderBottom: `10px solid ${c}` }} />;
    case "sticker":
      return <div className={`w-28 h-28 rounded-full ${box}`} style={{ background: c }} />;
    default:
      return <div className={`w-32 h-32 rounded-2xl ${box}`} style={{ background: c }} />;
  }
}
