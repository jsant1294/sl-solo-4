"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 7 * 1024 * 1024; // stays under the 8 MB server-action body limit

/** Drag-and-drop (or click) image field for operator CMS forms; submits with the surrounding form as `name`. */
export function ImageDrop({ current, name = "imageFile", emptyLabel = "No image — product photo is used" }: { current: { url: string; alt: string } | null; name?: string; emptyLabel?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  function accept(files: FileList | null) {
    const file = files?.[0];
    setError(null);
    if (!file) { setPreview(null); return; }
    if (!file.type.startsWith("image/")) { setError("Choose an image file (JPG, PNG, WebP)."); clear(); return; }
    if (file.size > MAX_BYTES) { setError("Image is larger than 7 MB — export a smaller version."); clear(); return; }
    if (input.current && input.current.files !== files) { const dt = new DataTransfer(); dt.items.add(file); input.current.files = dt.files; }
    setPreview(URL.createObjectURL(file));
  }
  function clear() { if (input.current) input.current.value = ""; setPreview(null); }

  const shown = preview ?? current?.url ?? null;
  return <div className="grid gap-3 sm:grid-cols-[140px_1fr] items-stretch">
    <div className="aspect-[3/4] overflow-hidden rounded-lg border border-line bg-bg-sunken">
      {shown ? <img src={shown} alt={current?.alt ?? ""} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center p-3 text-center text-xs text-ink-faint">{emptyLabel}</div>}
    </div>
    <div
      role="button" tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files); }}
      className={`grid place-items-center rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors cursor-pointer ${over ? "border-gold bg-gold/5" : "border-line hover:border-gold/60"}`}
    >
      <div>
        <p className="font-medium">{preview ? "New image ready — save to publish" : "Drop an image here, or click to choose"}</p>
        <p className="mt-1 text-xs text-ink-faint">JPG, PNG or WebP · up to 7 MB</p>
        {preview && <button type="button" onClick={(e) => { e.stopPropagation(); clear(); }} className="mt-3 text-xs underline">Cancel new image</button>}
        {error && <p role="alert" className="mt-2 text-xs text-err">{error}</p>}
      </div>
      <input ref={input} type="file" name={name} accept="image/*" className="sr-only" onChange={(e) => accept(e.target.files)}/>
    </div>
  </div>;
}
