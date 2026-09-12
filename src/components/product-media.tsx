import { ProductShot } from "@/components/product-shot";

type ProductMediaShape = { productType: string; colors: string[]; primaryImage?: { url: string; alt: string | null; objectPosition: string } | null; cmsMedia?: { url: string; alt: string | null; objectPosition: string; kind: string } | null };

export function ProductMedia({ product, className = "w-full h-full" }: { product: ProductMediaShape; className?: string }) {
  return <div className={`relative overflow-hidden ${className}`}>
    {product.cmsMedia?.kind === "video" ? <video src={product.cmsMedia.url} controls muted playsInline preload="metadata" className="h-full w-full object-cover"/>
      : product.cmsMedia ? <img src={product.cmsMedia.url} alt={product.cmsMedia.alt ?? "SnapLink hardware"} className="h-full w-full object-cover" style={{ objectPosition: product.cmsMedia.objectPosition }}/>
      : product.primaryImage ? <img src={product.primaryImage.url} alt={product.primaryImage.alt ?? "SnapLink hardware"} className="h-full w-full object-cover" style={{ objectPosition: product.primaryImage.objectPosition }}/>
      : <ProductShot productType={product.productType} color={product.colors[0] === "Ivory" ? "#E8E4DA" : "#14120F"}/>}
    {product.colors.length > 0 && <div className="absolute bottom-3 left-3 flex gap-1 rounded-full bg-white/90 p-1.5 shadow-sm backdrop-blur">{product.colors.slice(0, 5).map((color) => <span key={color} title={color} className="h-4 w-4 rounded-full border border-black/10" style={{ background: swatch(color) }}/>)}</div>}
  </div>;
}

function swatch(name: string) { const color = name.toLowerCase(); if (color.includes("pink")) return "#e86fa6"; if (color.includes("blue")) return "#416db3"; if (color.includes("green")) return "#397d52"; if (color.includes("gold")) return "#b78a32"; if (color.includes("ivory") || color.includes("cream")) return "#f3ead5"; if (color.includes("purple")) return "#7352a2"; if (color.includes("steel")) return "#888780"; return "#14120f"; }
