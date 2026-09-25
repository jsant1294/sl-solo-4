"use client";
import { useMemo, useState } from "react";
import { saveBundleSlotsStructured } from "./actions";

export interface BuilderProduct {
  id: string;
  name: string;
  slug: string;
  productType: string;
  basePrice: number;
  active: boolean;
  stockStatus: string;
  variants: { id: string; label: string; sku: string | null; stockStatus: string }[];
}

interface BuilderOption { productId: string; variantId: string | null }
interface BuilderSlot { key: string; label: string; allowCustomerChoice: boolean; options: BuilderOption[] }

/** Every mutation is a `(prev) => next` updater applied inside the top-level setSlots functional
 * update, never a plain new-value object closed over a render-time prop. Two edits fired in rapid
 * succession (as real users occasionally do) would otherwise race: the second edit's closure
 * could capture the slot/option as it was BEFORE the first edit's state update committed, silently
 * reverting it. Threading updater functions all the way from the leaf <select>/<input> up to the
 * one setSlots call makes every edit apply against truly-current state, regardless of timing. */
type Updater<T> = (prev: T) => T;

function dollars(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 === 0 ? 0 : 2 });
}

function emptySlot(choice: boolean): BuilderSlot {
  return { key: crypto.randomUUID(), label: "", allowCustomerChoice: choice, options: [{ productId: "", variantId: null }] };
}

/** Searchable product select — filters an in-memory catalog (small, single-operator scale) by
 * name/slug/SKU. Never shows raw IDs as the primary label; excludes the bundle itself and any
 * other bundle (no nested bundles) via the `catalog` prop already being pre-filtered. */
function ProductSelect({
  catalog, value, onSelect,
}: { catalog: BuilderProduct[]; value: string; onSelect: (productId: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((p) =>
      p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      || p.variants.some((v) => v.sku?.toLowerCase().includes(q)));
  }, [catalog, query]);
  const selected = catalog.find((p) => p.id === value);

  return (
    <div className="grid gap-1.5">
      <input
        className="w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs"
        placeholder="Search by name, slug, or SKU…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        className="w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">Choose a product…</option>
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {dollars(p.basePrice)}{!p.active ? " (inactive)" : ""}{p.stockStatus === "out_of_stock" ? " (out of stock)" : ""}
          </option>
        ))}
      </select>
      {selected && !selected.active && <p className="text-xs text-warn">This product is currently hidden from the storefront.</p>}
    </div>
  );
}

function VariantSelect({
  product, value, onSelect,
}: { product: BuilderProduct | undefined; value: string | null; onSelect: (variantId: string | null) => void }) {
  if (!product || product.variants.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-ink-soft">Variant</label>
      <select
        className="w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">Choose a variant…</option>
        {product.variants.map((v) => (
          <option key={v.id} value={v.id}>{v.label}{v.stockStatus === "out_of_stock" ? " (out of stock)" : ""}</option>
        ))}
      </select>
      <p className="text-[0.7rem] text-ink-faint">Availability inherited from the product.</p>
    </div>
  );
}

function OptionRow({
  catalog, option, onUpdate, onRemove, removable,
}: { catalog: BuilderProduct[]; option: BuilderOption; onUpdate: (u: Updater<BuilderOption>) => void; onRemove?: () => void; removable: boolean }) {
  const product = catalog.find((p) => p.id === option.productId);
  return (
    <div className="grid gap-3 rounded-lg border border-line bg-bg p-3">
      <ProductSelect catalog={catalog} value={option.productId} onSelect={(productId) => onUpdate(() => ({ productId, variantId: null }))} />
      <VariantSelect product={product} value={option.variantId} onSelect={(variantId) => onUpdate((o) => ({ ...o, variantId }))} />
      {removable && (
        <button type="button" onClick={onRemove} className="text-xs text-red-700 justify-self-start">Remove</button>
      )}
    </div>
  );
}

function SlotCard({
  slot, catalog, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  slot: BuilderSlot; catalog: BuilderProduct[]; onUpdate: (u: Updater<BuilderSlot>) => void; onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-raised p-4 grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <input
          className="flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm font-medium"
          placeholder="e.g. Phone Tag, Wearable"
          value={slot.label}
          onChange={(e) => { const label = e.target.value; onUpdate((s) => ({ ...s, label })); }}
        />
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" disabled={isFirst} onClick={onMoveUp} className="rounded border border-line px-2 py-1 text-xs disabled:opacity-30">↑</button>
          <button type="button" disabled={isLast} onClick={onMoveDown} className="rounded border border-line px-2 py-1 text-xs disabled:opacity-30">↓</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={!slot.allowCustomerChoice} onChange={() => onUpdate((s) => ({ ...s, allowCustomerChoice: false, options: s.options.slice(0, 1) }))}/>
          Included
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={slot.allowCustomerChoice} onChange={() => onUpdate((s) => ({ ...s, allowCustomerChoice: true }))}/>
          Customer chooses
        </label>
        <span className="text-xs text-ink-faint ml-auto">Quantity: 1 <span title="Multiple quantity per bundle item isn't wired through checkout yet — each item ships as one unit.">ⓘ</span></span>
      </div>

      <div className="grid gap-3">
        {slot.options.map((opt, i) => (
          <OptionRow
            key={i}
            catalog={catalog}
            option={opt}
            removable={slot.allowCustomerChoice && slot.options.length > 1}
            onUpdate={(u) => onUpdate((s) => ({ ...s, options: s.options.map((x, j) => (j === i ? u(x) : x)) }))}
            onRemove={() => onUpdate((s) => ({ ...s, options: s.options.filter((_, j) => j !== i) }))}
          />
        ))}
        {slot.allowCustomerChoice && (
          <button
            type="button"
            onClick={() => onUpdate((s) => ({ ...s, options: [...s.options, { productId: "", variantId: null }] }))}
            className="text-xs text-gold self-start"
          >+ Add Choice</button>
        )}
      </div>

      <button type="button" onClick={onRemove} className="text-xs text-red-700 justify-self-start">Remove bundle item</button>
    </div>
  );
}

export function BundleBuilder({
  bundleProductId, catalog, initialSlots,
}: {
  bundleProductId: string;
  catalog: BuilderProduct[];
  initialSlots: Array<{ slotKey: string; label: string; allowCustomerChoice: boolean; options: BuilderOption[] }>;
}) {
  const [slots, setSlots] = useState<BuilderSlot[]>(() =>
    initialSlots.length
      ? initialSlots.map((s) => ({ key: s.slotKey, label: s.label, allowCustomerChoice: s.allowCustomerChoice, options: s.options.length ? s.options : [{ productId: "", variantId: null }] }))
      : [emptySlot(false)]);
  const [error, setError] = useState<string | null>(null);

  function move(i: number, dir: -1 | 1) {
    setSlots((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function validateClientSide(): string | null {
    if (!slots.length) return "Add at least one bundle item.";
    for (const s of slots) {
      if (!s.label.trim()) return "Every bundle item needs a name.";
      if (!s.options.length) return `"${s.label}" needs at least one product.`;
      for (const o of s.options) {
        if (!o.productId) return `Choose a product for "${s.label}".`;
        const product = catalog.find((p) => p.id === o.productId);
        if (product && product.variants.length > 0 && !o.variantId) return `Choose a variant for "${product.name}" in "${s.label}".`;
      }
    }
    return null;
  }

  const payload = JSON.stringify(slots.map((s) => ({
    label: s.label, allowCustomerChoice: s.allowCustomerChoice,
    options: s.options.map((o) => ({ productId: o.productId, variantId: o.variantId })),
  })));

  return (
    <form
      action={saveBundleSlotsStructured}
      onSubmit={(e) => {
        const problem = validateClientSide();
        if (problem) { e.preventDefault(); setError(problem); }
        else setError(null);
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="productId" value={bundleProductId} />
      <input type="hidden" name="slotsJson" value={payload} />

      <div className="grid gap-4">
        {slots.map((slot, i) => (
          <SlotCard
            key={slot.key}
            slot={slot}
            catalog={catalog}
            isFirst={i === 0}
            isLast={i === slots.length - 1}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
            onUpdate={(u) => setSlots((prev) => prev.map((x, j) => (j === i ? u(x) : x)))}
            onRemove={() => setSlots((prev) => prev.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setSlots((prev) => [...prev, emptySlot(false)])} className="rounded-md border border-line-strong px-4 py-2 text-sm">+ Add Fixed Item</button>
        <button type="button" onClick={() => setSlots((prev) => [...prev, emptySlot(true)])} className="rounded-md border border-line-strong px-4 py-2 text-sm">+ Add Customer Choice</button>
      </div>

      {error && <p className="text-sm text-err">{error}</p>}

      <button className="rounded-md bg-ink text-bg px-4 py-2.5 text-sm font-medium self-start">Save bundle contents</button>
    </form>
  );
}
