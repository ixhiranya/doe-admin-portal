import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

// ============================================================================
// ProductFilterSelect — the single, reusable Petroleum-Products selector for the
// internal DoE PPS Approver (Omar). Trigger reuses the DOE cream-pill style
// (matching the existing product picker); the dropdown reuses the clean
// search + checkmark list style (matching the Entity filter) so the whole PPS
// module stays visually consistent. Includes an "All Products" option.
// ============================================================================

export const PRODUCT_FILTER_OPTIONS: { id: string; label: string; code: string }[] = [
  { id: 'all',         label: 'All Products',                      code: 'ALL' },
  { id: 'lpg',         label: 'LPG',                               code: 'LPG' },
  { id: 'diesel',      label: 'Diesel',                            code: 'DSL' },
  { id: 'gasoline_98', label: 'Gasoline',                          code: 'GAS' },
  { id: 'jet_a1',      label: 'Jet Fuel',                          code: 'JET' },
  { id: 'saf',         label: 'Sustainable Aviation Fuel (SAF)',   code: 'SAF' },
  { id: 'fuel_oil',    label: 'Fuel Oil',                          code: 'FO' },
  { id: 'natural_gas', label: 'Natural Gas',                       code: 'NG' },
  { id: 'lng',         label: 'LNG',                               code: 'LNG' },
  { id: 'cng',         label: 'CNG',                               code: 'CNG' },
  { id: 'ethanol',     label: 'Ethanol',                           code: 'ETH' },
  { id: 'biodiesel',   label: 'Biodiesel',                         code: 'BIO' },
  { id: 'naphtha',     label: 'Naphtha',                           code: 'NPH' },
];

export function ProductFilterSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 30); }, [open]);

  const sel = PRODUCT_FILTER_OPTIONS.find((p) => p.id === value) ?? PRODUCT_FILTER_OPTIONS[0];
  const filtered = q ? PRODUCT_FILTER_OPTIONS.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())) : PRODUCT_FILTER_OPTIONS;
  const pick = (id: string) => { onChange(id); setOpen(false); setQ(''); };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger — DOE cream pill (h-10, aligns with the Monitoring view CTA). */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-[244px] h-10 bg-white border border-[#E5DCC8] rounded-xl pl-2.5 pr-3 text-left relative overflow-hidden shadow-doe-xs hover:border-[#0F4A5C] hover:shadow-doe-sm transition-all flex items-center justify-between"
      >
        <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-[#0F4A5C]" />
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center font-mono font-bold text-[9px] flex-shrink-0">{sel.code}</span>
          <span className="flex flex-col min-w-0">
            <span className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 leading-none">Filter Product</span>
            <span className="font-display text-[14px] font-semibold text-ink-950 leading-tight truncate">{sel.label}</span>
          </span>
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn('text-neutral-400 flex-shrink-0 ms-1 transition-transform', open && 'rotate-180')}><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {/* Dropdown — clean search + checkmark list (smooth open/close). */}
      <div
        role="listbox"
        className={cn(
          'absolute right-0 top-full mt-1.5 w-[280px] bg-white border border-neutral-100 rounded-xl shadow-doe-lg z-50 p-1.5 origin-top-right transition-all duration-150 ease-out',
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
        )}
      >
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full h-8 px-2.5 mb-1 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/20"
        />
        <div className="max-h-[320px] overflow-y-auto">
          {filtered.map((p) => {
            const selected = value === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(p.id)}
                className={cn('w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition', selected ? 'bg-action-orange-soft text-action-orange-deep font-semibold' : 'text-ink-950 hover:bg-neutral-50')}
              >
                <span className={cn('w-6 h-6 rounded grid place-items-center font-mono font-bold text-[8.5px] flex-shrink-0', selected ? 'bg-action-orange text-white' : 'bg-neutral-100 text-neutral-500')}>{p.code}</span>
                <span className="flex-1 truncate text-[12.5px]">{p.label}</span>
                <span className="w-3.5 flex-shrink-0">{selected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="px-2.5 py-2 text-[11.5px] text-neutral-400">No products match.</div>}
        </div>
      </div>
    </div>
  );
}
