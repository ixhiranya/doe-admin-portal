import { useEffect, useRef, useState } from 'react';
import { PPS_PRODUCTS } from '../../data/pps';
import { cn } from '../../lib/utils';
import type { PpsProduct } from '../../types/pps';

interface ProductPickerProps {
  value: string;
  onChange: (id: string) => void;
  eyebrow?: string;
  triggerSubtext?: (p: PpsProduct) => string;
  align?: 'left' | 'right';
  /** Compact single-line trigger (height matches an h-10 CTA button). */
  compact?: boolean;
  /** Modern compact 3-line trigger (eyebrow / product+chevron / subtext) sized
   *  to an h-14 CTA — used for Ahmed Al Mazrouei's submission header. */
  tight?: boolean;
  /** Restrict + order the dropdown to these product ids (BRD order). Used for
   *  the Entity User's submission dropdown so it shows only mapped products. */
  productIds?: string[];
  /** Per-user display rename for product labels (e.g. Ahmed: Jet A-1 → Jet Fuel).
   *  Affects only what is shown; ids and underlying data are unchanged. */
  labelOverride?: (p: PpsProduct) => string;
  /** Reorder the full default product list (does NOT restrict it, unlike
   *  productIds — counts/footer stay the same). Used for Omar to match Ahmed's
   *  BRD master order without switching to the entity-restricted footer. */
  order?: string[];
}

export function ProductPicker({
  value,
  onChange,
  eyebrow = 'Active product',
  triggerSubtext,
  align = 'right',
  compact = false,
  tight = false,
  productIds,
  labelOverride,
  order,
}: ProductPickerProps) {
  const product = PPS_PRODUCTS.find((p) => p.id === value) ?? PPS_PRODUCTS[0];
  const labelOf = (p: PpsProduct) => (labelOverride ? labelOverride(p) : p.label);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {tight ? (
        // Horizontal single-line trigger matched to the h-10 CTA — mirrors the
        // DoE "Filter product" dropdown style (cream border, rounded-xl, teal
        // hover, accent strip). Label and value sit side by side; chevron is
        // pinned far right and vertically centred.
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-[300px] h-10 bg-white border border-[#E5DCC8] rounded-xl pl-5 pr-5 text-left relative overflow-hidden shadow-doe-xs hover:border-[#0F4A5C] hover:shadow-doe-sm transition-all flex items-center"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-[2px]" style={{ background: product.model === 'distributor' ? '#0F4A5C' : '#7B3FE4' }} />
          <span className="flex items-center gap-[22px] min-w-0 flex-1">
            <span className="text-[11px] font-medium uppercase tracking-[2.5px] text-neutral-500 leading-none flex-shrink-0">{eyebrow}</span>
            <span className="font-display text-[18px] font-semibold text-ink-950 leading-none truncate">{labelOf(product)}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn('text-neutral-400 flex-shrink-0 ml-2 transition-transform', open && 'rotate-180')}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      ) : compact ? (
        // Compact trigger — exactly h-10 (matches an h-10 CTA), single line,
        // all content vertically centred. Width / border / radius / typography
        // (eyebrow + label) preserved from the full trigger.
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-[260px] h-10 bg-white border border-[#E5DCC8] rounded-xl px-3 text-left hover:border-[#0F4A5C] hover:shadow-doe-sm transition-all relative overflow-hidden shadow-doe-xs flex items-center justify-between"
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-[2px]"
            style={{ background: product.model === 'distributor' ? '#0F4A5C' : '#7B3FE4' }}
          />
          <span className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 flex-shrink-0">{eyebrow}</span>
            <span className="font-display text-[15px] font-bold text-ink-950 truncate">{labelOf(product)}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn('transition-transform text-[#0F4A5C] flex-shrink-0', open && 'rotate-180')}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-[260px] bg-white border border-[#E5DCC8] rounded-xl px-3 py-2 text-left hover:border-[#0F4A5C] hover:shadow-doe-sm transition-all relative overflow-hidden shadow-doe-xs"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: product.model === 'distributor' ? '#0F4A5C' : '#7B3FE4' }}
          />
          <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{eyebrow}</div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-display text-[18px] font-bold text-ink-950">{labelOf(product)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn('transition-transform text-[#0F4A5C]', open && 'rotate-180')}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="text-[11.5px] text-neutral-500 mt-0.5">
            {triggerSubtext
              ? triggerSubtext(product)
              : `${product.annualVolumeMt.toFixed(2)} Mt · ${product.model === 'distributor' ? 'Distributor' : 'Supplier'} model`}
          </div>
        </button>
      )}

      {open && (
        <div
          className={cn(
            // z-50 puts the dropdown above motion-div stacking contexts
            // (StatTile cards, etc.) that would otherwise bleed through.
            'absolute top-full mt-2 w-[640px] bg-white border border-neutral-100 rounded-xl shadow-doe-lg p-4 z-50 grid grid-cols-2 gap-x-8',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {(['distributor', 'supplier'] as const).map((model) => {
            // Restrict + order to the allowed product ids (Entity User dropdown);
            // otherwise the full default list per model (DOE / unchanged).
            const inModel = (p: PpsProduct) => p.model === model;
            // Default list, optionally reordered by `order` (listed ids first, in
            // that order; any unlisted products keep their original position after).
            const defaultList = order
              ? [...order.map((id) => PPS_PRODUCTS.find((p) => p.id === id)).filter((p): p is PpsProduct => !!p), ...PPS_PRODUCTS.filter((p) => !order.includes(p.id))]
              : PPS_PRODUCTS;
            const fuels = productIds
              ? productIds.map((id) => PPS_PRODUCTS.find((p) => p.id === id)).filter((p): p is PpsProduct => !!p && inModel(p))
              : defaultList.filter(inModel);
            if (fuels.length === 0) return null;
            return (
              <div key={model}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-700">
                    <span className={cn('w-1.5 h-1.5 rounded-full', model === 'distributor' ? 'bg-info-500' : 'bg-[#7B3FE4]')} />
                    {model} Model
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500">{fuels.length} fuels</div>
                </div>
                <div className="space-y-2">
                  {fuels.map((f) => (
                    <ProductPickerItem
                      key={f.id}
                      fuel={f}
                      label={labelOf(f)}
                      active={f.id === product.id}
                      onSelect={() => { setOpen(false); onChange(f.id); }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="col-span-2 mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[10.5px] font-sans uppercase tracking-wider text-neutral-500">
            <span>{productIds ? `${productIds.length} products · your entity` : `${PPS_PRODUCTS.length} products · 46 entity-fuel linkages`}</span>
            <span><kbd className="px-1.5 py-0.5 bg-neutral-100 rounded">⌘K</kbd> to search</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductPickerItem({ fuel, label, active, onSelect }: { fuel: PpsProduct; label: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn('w-full rounded-md border px-3 py-2 text-left transition', active ? 'bg-ink-950 text-white border-ink-950' : 'bg-white border-neutral-100 hover:bg-neutral-25')}
    >
      <div className="flex items-center justify-between">
        <span className={cn('text-[12.5px] font-semibold', active ? 'text-white' : 'text-ink-950')}>{label}</span>
        <span className={cn('font-mono text-[11px]', active ? 'text-white/80' : 'text-neutral-500')}>{fuel.annualVolumeMt} Mt</span>
      </div>
      <div className={cn('h-1 rounded-full mt-1.5', active ? 'bg-white/20' : 'bg-neutral-100')}>
        <div className={cn('h-full rounded-full', fuel.model === 'distributor' ? 'bg-info-500' : 'bg-[#7B3FE4]')} style={{ width: `${Math.min(100, (fuel.annualVolumeMt / 5) * 100)}%` }} />
      </div>
    </button>
  );
}
